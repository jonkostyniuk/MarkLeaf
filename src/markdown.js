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
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listStack = [];
  let blockquote = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    while (listStack.length) {
      html.push(`</${listStack.pop()}>`);
    }
  };

  const flushBlockquote = () => {
    if (!blockquote.length) return;
    html.push(`<blockquote>${renderMarkdown(blockquote.join("\n"))}</blockquote>`);
    blockquote = [];
  };

  const flushCode = () => {
    const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : "";
    html.push(`<pre><code${langClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    inCode = false;
    codeLang = "";
    codeLines = [];
  };

  const pushListItem = (type, content, checked) => {
    flushParagraph();
    flushBlockquote();
    const tag = type === "ol" ? "ol" : "ul";
    if (listStack[listStack.length - 1] !== tag) {
      flushList();
      listStack.push(tag);
      html.push(`<${tag}>`);
    }
    const task = checked === null ? "" : `<input type="checkbox" disabled${checked ? " checked" : ""}> `;
    html.push(`<li>${task}${renderInline(content)}</li>`);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        flushBlockquote();
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushBlockquote();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = heading[1].length;
      const content = heading[2].trim();
      const id = slugifyHeading(content);
      html.push(`<h${level} id="${id}">${renderInline(content)}</h${level}>`);
      continue;
    }

    if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushBlockquote();
      html.push("<hr>");
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      flushList();
      blockquote.push(line.replace(/^>\s?/, ""));
      continue;
    }

    if (looksLikeTable(lines, i)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const table = collectTable(lines, i);
      html.push(renderTable(table.rows));
      i = table.endIndex;
      continue;
    }

    const unordered = /^[-*+]\s+(\[[ xX]\]\s+)?(.+)$/.exec(line);
    if (unordered) {
      const marker = unordered[1];
      const checked = marker ? /x/i.test(marker) : null;
      pushListItem("ul", unordered[2], checked);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      pushListItem("ol", ordered[1], null);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) flushCode();
  flushParagraph();
  flushList();
  flushBlockquote();

  return html.join("\n");
}

function renderInline(value) {
  let text = escapeHtml(value);
  text = text.replace(/!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_match, alt, url, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${titleAttr}>`;
  });
  text = text.replace(/\[([^\]]+)]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (_match, label, url, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(url)}"${titleAttr}>${label}</a>`;
  });
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return text;
}

function looksLikeTable(lines, index) {
  const header = lines[index] || "";
  const divider = lines[index + 1] || "";
  return header.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(divider);
}

function collectTable(lines, startIndex) {
  const rows = [];
  let endIndex = startIndex;

  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.includes("|") || !line.trim()) break;
    rows.push(line);
    endIndex = i;
  }

  return { rows, endIndex };
}

function splitTableRow(row) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(rows) {
  const header = splitTableRow(rows[0]);
  const body = rows.slice(2).map(splitTableRow);
  const headHtml = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}
