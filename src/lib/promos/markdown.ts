import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Convert promo markdown to HTML safe to inject into a page.
 *
 * The allowed tag list is deliberately narrow: headings, images, and tables
 * would let promo copy break the site's type scale and layout, so they are
 * stripped while their text content is kept.
 */
export function renderMarkdown(source: string): string {
  if (!source.trim()) return "";

  const raw = marked.parse(source, { async: false }) as string;

  return sanitizeHtml(raw, {
    allowedTags: ["p", "strong", "em", "a", "ul", "ol", "li", "br"],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  }).trim();
}
