import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders bold", () => {
    expect(renderMarkdown("**loud**")).toContain("<strong>loud</strong>");
  });

  it("renders italic", () => {
    expect(renderMarkdown("*soft*")).toContain("<em>soft</em>");
  });

  it("renders unordered lists", () => {
    const html = renderMarkdown("- one\n- two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>one</li>");
  });

  it("renders links and hardens them", () => {
    const html = renderMarkdown("[contact](/contact)");
    expect(html).toContain('href="/contact"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("strips script tags", () => {
    const html = renderMarkdown("hello <script>alert(1)</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(1)");
  });

  it("strips event handler attributes", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    expect(html).not.toContain("onerror");
  });

  it("strips javascript: URLs", () => {
    const html = renderMarkdown("[bad](javascript:alert(1))");
    expect(html).not.toContain("javascript:");
  });

  it("strips heading tags, which would break the promo type scale", () => {
    const html = renderMarkdown("# Enormous");
    expect(html).not.toContain("<h1");
    expect(html).toContain("Enormous");
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
  });
});
