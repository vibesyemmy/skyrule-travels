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
});
