import { describe, it, expect } from "vitest";
import { parseDocument, EMPTY_DOCUMENT, PLACEMENTS } from "./schema";

const validPromo = {
  id: "abc",
  placement: "bar",
  enabled: true,
  eyebrow: null,
  headline: "Dubai from N850,000",
  body: "**Return fares**",
  bodyHtml: "<p><strong>Return fares</strong></p>",
  image: null,
  cta: null,
  startsAt: null,
  endsAt: null,
  updatedAt: "2026-08-18T10:00:00.000Z",
  updatedBy: "someone@skyruletravels.com",
};

describe("PLACEMENTS", () => {
  it("has exactly the three supported placements", () => {
    expect(PLACEMENTS).toEqual(["bar", "modal", "section"]);
  });
});

describe("parseDocument", () => {
  it("accepts a valid document", () => {
    const doc = parseDocument({ version: 1, promos: [validPromo] });
    expect(doc.promos).toHaveLength(1);
    expect(doc.promos[0].headline).toBe("Dubai from N850,000");
  });

  it("returns an empty document for null", () => {
    expect(parseDocument(null)).toEqual(EMPTY_DOCUMENT);
  });

  it("returns an empty document for a non-object", () => {
    expect(parseDocument("nonsense")).toEqual(EMPTY_DOCUMENT);
  });

  it("returns an empty document when promos is not an array", () => {
    expect(parseDocument({ version: 1, promos: {} })).toEqual(EMPTY_DOCUMENT);
  });

  it("drops individual promos that are malformed, keeping valid ones", () => {
    const doc = parseDocument({
      version: 1,
      promos: [validPromo, { id: "broken" }],
    });
    expect(doc.promos).toHaveLength(1);
    expect(doc.promos[0].id).toBe("abc");
  });

  it("drops a promo with an unknown placement", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, placement: "sidebar" }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("keeps a fully populated image and cta", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{
        ...validPromo,
        image: { url: "https://x/y.jpg", width: 1600, height: 900, alt: "A plane" },
        cta: { label: "Get a quote", href: "/contact" },
      }],
    });
    expect(doc.promos[0].image?.width).toBe(1600);
    expect(doc.promos[0].cta?.label).toBe("Get a quote");
  });

  it("drops a promo whose image is missing alt text", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{
        ...validPromo,
        image: { url: "https://x/y.jpg", width: 1600, height: 900 },
      }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("returns an empty document rather than throwing on a hostile object", () => {
    const hostile = { get promos() { throw new Error("boom"); } };
    expect(parseDocument(hostile)).toEqual(EMPTY_DOCUMENT);
  });

  it("drops a promo whose property access throws", () => {
    const hostile = { get id() { throw new Error("boom"); } };
    const doc = parseDocument({ version: 1, promos: [hostile] });
    expect(doc.promos).toHaveLength(0);
  });

  it("drops a promo whose startsAt is not a parseable date", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, startsAt: "draft" }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("drops a promo whose endsAt is not a parseable date", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, endsAt: "18/08/2026" }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("keeps a promo with startsAt: null and a valid ISO endsAt", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, startsAt: null, endsAt: "2026-09-01T00:00:00.000Z" }],
    });
    expect(doc.promos).toHaveLength(1);
  });

  it("drops a promo with a whitespace-only headline", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, headline: "   " }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("drops a promo with an empty-string id", () => {
    const doc = parseDocument({
      version: 1,
      promos: [{ ...validPromo, id: "" }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("drops a promo whose image width is Infinity", () => {
    const { width } = JSON.parse('{"width":1e400}');
    const doc = parseDocument({
      version: 1,
      promos: [{
        ...validPromo,
        image: { url: "https://x/y.jpg", width, height: 900, alt: "A plane" },
      }],
    });
    expect(doc.promos).toHaveLength(0);
  });

  it("returns a fresh object from parseDocument(null) on each call", () => {
    const a = parseDocument(null);
    const b = parseDocument(null);
    expect(a).not.toBe(b);
  });
});
