import { list, put, del } from "@vercel/blob";
import { parseDocument, type Placement, type Promo, type PromoDocument } from "./schema";

/**
 * Each save writes a NEW, immutable document rather than overwriting one path.
 *
 * This is not a stylistic choice. Vercel Blob serves public blobs from its CDN
 * with a 60-second minimum max-age, and the SDK only offers a cache bypass for
 * *private* blobs. Overwriting a single `promos.json` therefore gave stale
 * reads — and because saving is read-modify-write, a stale read silently
 * dropped whichever change came first. Writing to a fresh pathname each time
 * means the URL has never been cached, so the read is always current.
 *
 * A useful side effect: the last few versions remain in the store, which is the
 * closest thing this design has to an edit history.
 */
const DOC_PREFIX = "promos/doc-";
const VERSIONS_KEPT = 5;
const READ_ATTEMPTS = 3;
const RETRY_DELAY_MS = 150;

const EMPTY = (): PromoDocument => ({ version: 1, promos: [] });

interface BlobRecord {
  url: string;
  pathname: string;
  uploadedAt: Date | string;
}

/** The slice of the Vercel Blob API this module uses, narrowed so tests can supply a fake. */
export interface BlobClient {
  list(options: { prefix: string; limit?: number }): Promise<{ blobs: BlobRecord[] }>;
  put(pathname: string, body: string, options?: Record<string, unknown>): Promise<{ url: string }>;
  del(urlOrPathname: string): Promise<void>;
}

const newestFirst = (blobs: BlobRecord[]): BlobRecord[] =>
  blobs.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

export function createPromoStore(client: BlobClient, fetchImpl: typeof fetch) {
  /**
   * Fetch and parse a stored document, retrying transient failures.
   *
   * Vercel's blob CDN intermittently answers a public URL with a 403 challenge
   * page instead of the content — measured at roughly one request in
   * twenty-five. Treating that as "no promos" would blank the site at random,
   * so a few quick retries come first. Returns null when the document genuinely
   * could not be read, which callers distinguish from "there is no document".
   */
  async function fetchDocument(url: string): Promise<PromoDocument | null> {
    for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetchImpl(url, { cache: "no-store" });
        if (response.ok) return parseDocument(await response.json());
      } catch {
        // network blip — fall through to the retry
      }
      if (attempt < READ_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
    return null;
  }

  /**
   * Read the current document for RENDERING. Never throws — every failure mode
   * degrades to an empty document, so a visitor's page renders exactly as it
   * would with no promos configured.
   */
  async function read(): Promise<PromoDocument> {
    try {
      const { blobs } = await client.list({ prefix: DOC_PREFIX, limit: 100 });
      if (blobs.length === 0) return EMPTY();
      const document = await fetchDocument(newestFirst(blobs)[0].url);
      if (!document) {
        // Degrading quietly is correct for a visitor, but it must not be
        // invisible to us: an unexplained "no promos" is otherwise
        // indistinguishable from none being configured.
        console.error("[promos] document could not be fetched after retries — rendering no promos");
        return EMPTY();
      }
      return document;
    } catch (error) {
      console.error("[promos] blob store unreachable — rendering no promos:", error);
      return EMPTY();
    }
  }

  /**
   * Read the current document BEFORE WRITING. Unlike read(), this throws when a
   * document exists but cannot be fetched.
   *
   * That distinction prevents real data loss: saving replaces the whole
   * document, so treating an unreadable document as empty would wipe every
   * other placement. Failing loudly instead surfaces an error the admin shows
   * while keeping the client's typed copy in the form.
   */
  async function readForWrite(): Promise<PromoDocument> {
    const { blobs } = await client.list({ prefix: DOC_PREFIX, limit: 100 });
    if (blobs.length === 0) return EMPTY();
    const document = await fetchDocument(newestFirst(blobs)[0].url);
    if (!document) {
      throw new Error("Could not read the current promos; refusing to overwrite them.");
    }
    return document;
  }

  /**
   * Write a new version. Unlike read, this throws — the admin must see a
   * failure rather than believe the client's work was saved.
   */
  async function write(document: PromoDocument): Promise<void> {
    const pathname = `${DOC_PREFIX}${Date.now()}-${crypto.randomUUID()}.json`;
    await client.put(pathname, JSON.stringify(document, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
      // This pathname is never rewritten, so it is safe to cache hard.
      cacheControlMaxAge: 31536000,
    });
    await prune();
  }

  /** Drop all but the most recent versions. A prune failure must not fail the save. */
  async function prune(): Promise<void> {
    try {
      const { blobs } = await client.list({ prefix: DOC_PREFIX, limit: 100 });
      for (const stale of newestFirst(blobs).slice(VERSIONS_KEPT)) {
        await client.del(stale.url);
      }
    } catch (error) {
      console.error("[promos] could not prune old document versions:", error);
    }
  }

  /**
   * Save a promo. The document holds at most ONE record per placement, so a
   * save replaces that placement's promo outright.
   *
   * An earlier version kept superseded records and merely flagged them
   * disabled. That made "the promo for this placement" ambiguous — the admin
   * dashboard read the oldest record while the site served the newest — and let
   * the document grow without bound. The admin has exactly three slots, so one
   * record per placement is both simpler and what the UI already implies.
   */
  async function save(promo: Promo): Promise<void> {
    const document = await readForWrite();
    const otherPlacements = document.promos.filter((p) => p.placement !== promo.placement);
    await write({ version: 1, promos: [...otherPlacements, promo] });
  }

  async function clear(placement: Placement): Promise<void> {
    const document = await readForWrite();
    await write({ version: 1, promos: document.promos.filter((p) => p.placement !== placement) });
  }

  return { read, write, save, clear };
}

export const promoStore = createPromoStore({ list, put, del } as unknown as BlobClient, fetch);
