// A minimal, deliberately constrained markdown-to-HTML renderer — not a
// general HTML sanitizer. Safe specifically because it only ever emits tags
// *we* choose (b/i/ul/li/br/p) around text that's been HTML-escaped first;
// the source is never trusted as raw HTML. Supports: **bold**, *italic*,
// `- ` bullet lines, and blank-line paragraph breaks — enough for lesson
// content and announcements without pulling in a markdown library.
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>");
}

export function markdownToHtml(source: string): string {
  const blocks = source.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) return "";
      const isList = lines.every((l) => /^\s*[-*]\s+/.test(l));
      if (isList) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inline).join("<br />")}</p>`;
    })
    .filter(Boolean)
    .join("");
}
