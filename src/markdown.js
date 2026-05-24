import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false
}).use(taskLists, {
  enabled: false,
  label: false
});

const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

export function slugifyHeading(value) {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractHeadings(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (!match) return null;
      return {
        level: match[1].length,
        text: match[2].trim(),
        line: index + 1,
        id: slugifyHeading(match[2])
      };
    })
    .filter(Boolean);
}

export function getWordCount(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_\-[\]()|~`]/g, " ");
  const words = text.match(/\b[\w']+\b/g);
  return words ? words.length : 0;
}

export function renderMarkdown(markdown) {
  return addHeadingIds(markdownRenderer.render(markdown));
}

function addHeadingIds(html) {
  return html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_match, level, content) => {
    const plain = content.replace(/<[^>]*>/g, "");
    return `<h${level} id="${slugifyHeading(plain)}">${content}</h${level}>`;
  });
}
