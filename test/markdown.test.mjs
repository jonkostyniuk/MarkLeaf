import assert from "node:assert/strict";
import test from "node:test";

import { extractHeadings, getWordCount, renderMarkdown, slugifyHeading } from "../src/markdown.js";

test("renders headings, emphasis, and links", () => {
  const html = renderMarkdown("# Title\n\nThis is **bold** and [linked](https://example.com).");

  assert.match(html, /<h1 id="title">Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">linked<\/a>/);
});

test("renders GFM-style tables", () => {
  const html = renderMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |");

  assert.match(html, /<table>/);
  assert.match(html, /<th>A<\/th>/);
  assert.match(html, /<td>2<\/td>/);
});

test("extracts heading outline with line numbers", () => {
  const headings = extractHeadings("# One\n\nText\n\n## Two");

  assert.deepEqual(headings, [
    { level: 1, text: "One", line: 1, id: "one" },
    { level: 2, text: "Two", line: 5, id: "two" }
  ]);
});

test("counts content words while ignoring markdown punctuation", () => {
  assert.equal(getWordCount("# Title\n\nThis is **bold** text."), 5);
});

test("slugifies headings for preview anchors", () => {
  assert.equal(slugifyHeading("Project: Alpha/Beta Plan"), "project-alpha-beta-plan");
});
