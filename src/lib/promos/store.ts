import { list, put } from "@vercel/blob";
import { EMPTY_DOCUMENT, parseDocument, type Placement, type Promo, type PromoDocument } from "./schema";

const PROMOS_PATH = "promos.json";

/**
 * The slice of the Vercel Blob API this module uses, narrowed so tests can
 * supply an in-memory stand-in without pulling in the SDK.
 */
export interface BlobClient {
  list(options: { prefix: string; limit?: number }): Promise<{ blobs: { url: string; pathname: string }[] }>;
  put(pathname: string, body: string, options?: Record<string, unknown>): Promise<{ url: string }>;
}

export function createPromoStore(client: BlobClient, fetchImpl: typeof fetch) {
  async function locate(): Promise<string | null> {
    const { blobs } = await client.list({ prefix: PROMOS_PATH, limit: 1 });
    return blobs[0]?.url ?? null;
  }

  /**
   * Read the promo document. Never throws — every failure mode (Blob down,
   * missing document, corrupt JSON) degrades to an empty document so a
   * visitor's page renders exactly as it would with no promos configured.
   *
   * `fresh` appends a cache-buster, needed in the admin where a read
   * immediately follows a write and the CDN copy would still be stale.
   */
  async function read(options: { fresh?: boolean } = {}): Promise<PromoDocument> {
    try {
      const url = await locate();
      if (!url) return EMPTY_DOCUMENT;
      const target = options.fresh ? `${url}?t=${Date.now()}` : url;
      const response = await fetchImpl(target, { cache: "no-store" });
      if (!response.ok) return EMPTY_DOCUMENT;
      return parseDocument(await response.json());
    } catch {
      return EMPTY_DOCUMENT;
    }
  }

  /** Overwrite the document. Unlike read, this throws — the admin must see failures. */
  async function write(document: PromoDocument): Promise<void> {
    await client.put(PROMOS_PATH, JSON.stringify(document, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 60,
    });
  }

  /**
   * Save a promo, enforcing one enabled promo per placement. Enabling a promo
   * disables any other in the same placement, so the conflict is resolved at
   * the moment the client causes it rather than silently at render time.
   */
  async function save(promo: Promo): Promise<void> {
    const document = await read({ fresh: true });
    const others = document.promos.filter((p) => p.id !== promo.id);
    const adjusted = promo.enabled
      ? others.map((p) => (p.placement === promo.placement ? { ...p, enabled: false } : p))
      : others;
    await write({ version: 1, promos: [...adjusted, promo] });
  }

  async function clear(placement: Placement): Promise<void> {
    const document = await read({ fresh: true });
    await write({ version: 1, promos: document.promos.filter((p) => p.placement !== placement) });
  }

  return { read, write, save, clear };
}

export const promoStore = createPromoStore({ list, put } as unknown as BlobClient, fetch);
