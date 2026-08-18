import { describe, it, expect } from "vitest";
import { createPromoStore, type BlobClient } from "./store";
import type { Promo } from "./schema";

const promo = (over: Partial<Promo> = {}): Promo => ({
  id: "1", placement: "bar", enabled: true, eyebrow: null,
  headline: "H", body: "B", bodyHtml: "<p>B</p>",
  image: null, cta: null, startsAt: null, endsAt: null,
  updatedAt: "2026-08-01T00:00:00.000Z", updatedBy: "a@b.com",
  ...over,
});

/**
 * In-memory stand-in for Vercel Blob. Models the real thing's important
 * property: every put creates a distinct pathname, and reads go through the URL
 * that put returned — so a test can tell whether read() found the newest one.
 */
function fakeBlob(seed?: { promos: Promo[] }) {
  const store = new Map<string, { body: string; uploadedAt: Date }>();
  let clock = 0;
  const put = async (pathname: string, body: string) => {
    clock += 1000;
    store.set(pathname, { body, uploadedAt: new Date(clock) });
    return { url: `https://blob.test/${pathname}` };
  };
  if (seed) void put("promos/doc-1-seed.json", JSON.stringify({ version: 1, ...seed }));

  const client: BlobClient = {
    async list({ prefix }) {
      return {
        blobs: [...store.entries()]
          .filter(([pathname]) => pathname.startsWith(prefix))
          .map(([pathname, v]) => ({ url: `https://blob.test/${pathname}`, pathname, uploadedAt: v.uploadedAt })),
      };
    },
    put,
    async del(url) { store.delete(url.replace("https://blob.test/", "")); },
  };
  const fetchImpl = async (url: string | URL) => {
    const entry = store.get(String(url).replace("https://blob.test/", ""));
    return { ok: Boolean(entry), json: async () => JSON.parse(entry!.body) } as Response;
  };
  const current = () => {
    const newest = [...store.entries()]
      .filter(([p]) => p.startsWith("promos/doc-"))
      .sort((a, b) => b[1].uploadedAt.getTime() - a[1].uploadedAt.getTime())[0];
    return newest ? (JSON.parse(newest[1].body).promos as Promo[]) : [];
  };
  return { client, fetchImpl: fetchImpl as unknown as typeof fetch, store, current };
}

describe("read", () => {
  it("returns an empty document when nothing is stored", async () => {
    const { client, fetchImpl } = fakeBlob();
    expect(await createPromoStore(client, fetchImpl).read()).toEqual({ version: 1, promos: [] });
  });

  it("returns the stored document", async () => {
    const { client, fetchImpl } = fakeBlob({ promos: [promo({ headline: "Stored" })] });
    const doc = await createPromoStore(client, fetchImpl).read();
    expect(doc.promos[0].headline).toBe("Stored");
  });

  it("reads the NEWEST version, not the first listed", async () => {
    const { client, fetchImpl } = fakeBlob({ promos: [promo({ headline: "Old" })] });
    const store = createPromoStore(client, fetchImpl);
    await store.write({ version: 1, promos: [promo({ headline: "New" })] });
    const doc = await store.read();
    expect(doc.promos[0].headline).toBe("New");
  });

  it("degrades to an empty document when the fetch fails", async () => {
    const { client } = fakeBlob({ promos: [promo()] });
    const failing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    expect(await createPromoStore(client, failing).read()).toEqual({ version: 1, promos: [] });
  });

  it("degrades to an empty document when listing throws", async () => {
    const client: BlobClient = {
      async list() { throw new Error("blob unreachable"); },
      async put() { return { url: "" }; },
      async del() {},
    };
    expect(await createPromoStore(client, fetch).read()).toEqual({ version: 1, promos: [] });
  });

  it("degrades to an empty document when the stored JSON is corrupt", async () => {
    const { client } = fakeBlob({ promos: [] });
    const broken = (async () => ({ ok: true, json: async () => { throw new SyntaxError("bad"); } })) as unknown as typeof fetch;
    expect(await createPromoStore(client, broken).read()).toEqual({ version: 1, promos: [] });
  });
});

describe("write", () => {
  it("never overwrites a pathname — each version is a new blob", async () => {
    const { client, fetchImpl, store } = fakeBlob();
    const s = createPromoStore(client, fetchImpl);
    await s.write({ version: 1, promos: [promo({ headline: "one" })] });
    await s.write({ version: 1, promos: [promo({ headline: "two" })] });
    const docs = [...store.keys()].filter((k) => k.startsWith("promos/doc-"));
    expect(new Set(docs).size).toBe(docs.length);
    expect(docs.length).toBe(2);
  });

  it("prunes old versions beyond the retention limit", async () => {
    const { client, fetchImpl, store } = fakeBlob();
    const s = createPromoStore(client, fetchImpl);
    for (let i = 0; i < 9; i += 1) await s.write({ version: 1, promos: [promo({ headline: `v${i}` })] });
    expect([...store.keys()].filter((k) => k.startsWith("promos/doc-")).length).toBe(5);
  });

  it("keeps the newest version readable after pruning", async () => {
    const { client, fetchImpl } = fakeBlob();
    const s = createPromoStore(client, fetchImpl);
    for (let i = 0; i < 9; i += 1) await s.write({ version: 1, promos: [promo({ headline: `v${i}` })] });
    expect((await s.read()).promos[0].headline).toBe("v8");
  });

  it("does not fail the write when pruning fails", async () => {
    const { client, fetchImpl } = fakeBlob();
    const failingDel: BlobClient = { ...client, async del() { throw new Error("delete refused"); } };
    const s = createPromoStore(failingDel, fetchImpl);
    for (let i = 0; i < 7; i += 1) await s.write({ version: 1, promos: [promo({ headline: `v${i}` })] });
    expect((await s.read()).promos[0].headline).toBe("v6");
  });
});

describe("save", () => {
  it("adds a promo to an empty document", async () => {
    const { client, fetchImpl, current } = fakeBlob();
    await createPromoStore(client, fetchImpl).save(promo({ id: "new" }));
    expect(current()).toHaveLength(1);
  });

  it("replaces a promo with the same id rather than duplicating it", async () => {
    const { client, fetchImpl, current } = fakeBlob({ promos: [promo({ id: "1", headline: "Old" })] });
    await createPromoStore(client, fetchImpl).save(promo({ id: "1", headline: "New" }));
    expect(current()).toHaveLength(1);
    expect(current()[0].headline).toBe("New");
  });

  it("replaces the placement's existing promo rather than keeping both", async () => {
    const { client, fetchImpl, current } = fakeBlob({ promos: [promo({ id: "old", placement: "bar" })] });
    await createPromoStore(client, fetchImpl).save(promo({ id: "new", placement: "bar", enabled: true }));
    const bars = current().filter((p) => p.placement === "bar");
    expect(bars).toHaveLength(1);
    expect(bars[0].id).toBe("new");
  });

  it("leaves other placements untouched", async () => {
    const { client, fetchImpl, current } = fakeBlob({ promos: [promo({ id: "modal", placement: "modal" })] });
    await createPromoStore(client, fetchImpl).save(promo({ id: "bar", placement: "bar" }));
    expect(current().find((p) => p.id === "modal")!.enabled).toBe(true);
    expect(current()).toHaveLength(2);
  });

  it("replaces with a disabled promo too, so the placement goes dark", async () => {
    const { client, fetchImpl, current } = fakeBlob({ promos: [promo({ id: "old", placement: "bar" })] });
    await createPromoStore(client, fetchImpl).save(promo({ id: "new", placement: "bar", enabled: false }));
    const bars = current().filter((p) => p.placement === "bar");
    expect(bars).toHaveLength(1);
    expect(bars[0].enabled).toBe(false);
  });

  it("never accumulates more records than there are placements", async () => {
    const { client, fetchImpl, current } = fakeBlob();
    const s = createPromoStore(client, fetchImpl);
    for (let i = 0; i < 6; i += 1) {
      await s.save(promo({ id: `bar-${i}`, placement: "bar", headline: `v${i}` }));
      await s.save(promo({ id: `modal-${i}`, placement: "modal" }));
    }
    expect(current()).toHaveLength(2);
    expect(current().find((p) => p.placement === "bar")!.headline).toBe("v5");
  });

  it("a second save sees the first — no lost update", async () => {
    const { client, fetchImpl, current } = fakeBlob();
    const s = createPromoStore(client, fetchImpl);
    await s.save(promo({ id: "section", placement: "section" }));
    await s.save(promo({ id: "modal", placement: "modal" }));
    expect(current().map((p) => p.id).sort()).toEqual(["modal", "section"]);
  });
});

describe("clear", () => {
  it("removes every promo for a placement", async () => {
    const { client, fetchImpl, current } = fakeBlob({
      promos: [promo({ id: "a", placement: "bar" }), promo({ id: "b", placement: "modal" })],
    });
    await createPromoStore(client, fetchImpl).clear("bar");
    expect(current()).toHaveLength(1);
    expect(current()[0].placement).toBe("modal");
  });
});
