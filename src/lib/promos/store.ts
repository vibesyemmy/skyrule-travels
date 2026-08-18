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
   * Read the current document. Never throws — every failure mode (Blob
   * unreachable, nothing stored yet, corrupt JSON) degrades to an empty
   * document, so a visitor's page renders exactly as it would with no promos.
   */
  async function read(): Promise<PromoDocument> {
    try {
      const { blobs } = await client.list({ prefix: DOC_PREFIX, limit: 100 });
      if (blobs.length === 0) return EMPTY();
      const response = await fetchImpl(newestFirst(blobs)[0].url, { cache: "no-store" });
      if (!response.ok) return EMPTY();
      return parseDocument(await response.json());
    } catch {
      return EMPTY();
    }
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
    const document = await read();
    const otherPlacements = document.promos.filter((p) => p.placement !== promo.placement);
    await write({ version: 1, promos: [...otherPlacements, promo] });
  }

  async function clear(placement: Placement): Promise<void> {
    const document = await read();
    await write({ version: 1, promos: document.promos.filter((p) => p.placement !== placement) });
  }

  return { read, write, save, clear };
}

export const promoStore = createPromoStore({ list, put, del } as unknown as BlobClient, fetch);
