import { describe, it, expect } from "vitest";
import { createPromoStore, type BlobClient } from "./store";
import { EMPTY_DOCUMENT, type Promo } from "./schema";

const promo = (over: Partial<Promo> = {}): Promo => ({
  id: "1", placement: "bar", enabled: true, eyebrow: null,
  headline: "H", body: "B", bodyHtml: "<p>B</p>",
  image: null, cta: null, startsAt: null, endsAt: null,
  updatedAt: "2026-08-01T00:00:00.000Z", updatedBy: "a@b.com",
  ...over,
});

/** In-memory stand-in for Vercel Blob. Records what was written. */
function fakeBlob(initial?: string) {
  const state = { content: initial, puts: 0 };
  const client: BlobClient = {
    async list() {
      return state.content === undefined
        ? { blobs: [] }
        : { blobs: [{ url: "https://blob.test/promos.json", pathname: "promos.json" }] };
    },
    async put(_pathname, body) {
      state.content = body;
      state.puts += 1;
      return { url: "https://blob.test/promos.json" };
    },
  };
  const fetchImpl = async () =>
    ({ ok: true, json: async () => JSON.parse(state.content!) }) as Response;
  return { client, fetchImpl, state };
}

describe("read", () => {
  it("returns an empty document when nothing has been stored", async () => {
    const { client, fetchImpl } = fakeBlob();
    const store = createPromoStore(client, fetchImpl);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("returns the stored document", async () => {
    const { client, fetchImpl } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ headline: "Stored" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    const doc = await store.read();
    expect(doc.promos[0].headline).toBe("Stored");
  });

  it("degrades to an empty document when the fetch fails", async () => {
    const { client } = fakeBlob(JSON.stringify({ version: 1, promos: [promo()] }));
    const failing = async () => { throw new Error("network down"); };
    const store = createPromoStore(client, failing as unknown as typeof fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("degrades to an empty document when the stored JSON is corrupt", async () => {
    const { client } = fakeBlob("{not json");
    const broken = async () =>
      ({ ok: true, json: async () => { throw new SyntaxError("bad"); } }) as unknown as Response;
    const store = createPromoStore(client, broken as unknown as typeof fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });

  it("degrades to an empty document when listing throws", async () => {
    const client: BlobClient = {
      async list() { throw new Error("blob unreachable"); },
      async put() { return { url: "" }; },
    };
    const store = createPromoStore(client, fetch);
    expect(await store.read()).toEqual(EMPTY_DOCUMENT);
  });
});

describe("save", () => {
  it("adds a promo to an empty document", async () => {
    const { client, fetchImpl, state } = fakeBlob(JSON.stringify(EMPTY_DOCUMENT));
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new" }));
    expect(JSON.parse(state.content!).promos).toHaveLength(1);
  });

  it("replaces a promo with the same id rather than duplicating it", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "1", headline: "Old" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "1", headline: "New" }));
    const saved = JSON.parse(state.content!).promos;
    expect(saved).toHaveLength(1);
    expect(saved[0].headline).toBe("New");
  });

  it("disables an existing enabled promo in the same placement", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "old", placement: "bar" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new", placement: "bar", enabled: true }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "old")!.enabled).toBe(false);
    expect(saved.find((p) => p.id === "new")!.enabled).toBe(true);
  });

  it("leaves other placements untouched", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "modal", placement: "modal" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "bar", placement: "bar" }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "modal")!.enabled).toBe(true);
  });

  it("does not disable anything when saving a disabled promo", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "old", placement: "bar" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.save(promo({ id: "new", placement: "bar", enabled: false }));
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved.find((p) => p.id === "old")!.enabled).toBe(true);
  });
});

describe("clear", () => {
  it("removes every promo for a placement", async () => {
    const { client, fetchImpl, state } = fakeBlob(
      JSON.stringify({ version: 1, promos: [promo({ id: "a", placement: "bar" }), promo({ id: "b", placement: "modal" })] }),
    );
    const store = createPromoStore(client, fetchImpl);
    await store.clear("bar");
    const saved = JSON.parse(state.content!).promos as Promo[];
    expect(saved).toHaveLength(1);
    expect(saved[0].placement).toBe("modal");
  });
});
