# MarkLeaf Style Reference

This document captures early CSS styling guidance for MarkLeaf document themes, based on layout and typography patterns from Microsoft Word and the extracted JKTS document branding colours.

It is a reference document, not yet the final MarkLeaf theme system. The values below can be used to develop a standard CSS style that makes Markdown output feel closer to a polished Word document.

The app loads built-in document styles from `styles/builtin/`. Built-in style IDs match CSS filenames without the `.css` extension, for example `styles/builtin/markleaf-light.css` maps to style id `markleaf-light` and `styles/builtin/markleaf-dark.css` maps to style id `markleaf-dark`.

## JKTS Brand Colours

The following colours were extracted from the source Word document's heading styles:

| Role | Colour | Source Usage | CSS Usage |
| --- | --- | --- | --- |
| JKTS blue | `#2E5E94` | Heading 1 | Primary headings, table headers, section accents |
| JKTS green | `#29A94F` | Heading 2 | Secondary headings, supporting accents |

## Page Layout

Word's page layout model maps naturally to a constrained document container in CSS.

- Use `max-width` and horizontal centering to mimic page margins.
- Use `padding` on the document container so text does not touch the viewport edge.
- Use print-specific rules for page margins and breaks.
- Use `<hr>` or print `break-before` rules for section/page breaks.

Suggested defaults:

```css
.document {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
}

@media print {
  @page {
    margin: 1in;
  }
}
```

## Heading Styles

The source Word document gives a practical heading palette:

- H1 equivalent: `#2E5E94`, Arial, approximately 16pt.
- H2 equivalent: `#29A94F`, Arial, approximately 14pt.

CSS guidance:

- Use size, weight, spacing, and colour for hierarchy.
- Avoid underlined headings unless the style is intentionally decorative.
- Use more space above headings than below them.
- Keep heading line-height tighter than body text.

Suggested defaults:

```css
h1 {
  color: #2E5E94;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 2rem 0 0.5rem;
}

h2 {
  color: #29A94F;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 1.5rem 0 0.4rem;
}

h3 {
  color: #2E5E94;
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.3;
  margin: 1.2rem 0 0.3rem;
}
```

## Paragraph Spacing

Word separates line spacing within a paragraph from spacing between paragraphs. CSS should do the same.

- Use `line-height` for internal readability.
- Use `margin-bottom` for spacing between paragraphs.
- Avoid simulating paragraph spacing with extra blank lines.
- Keep the first paragraph after a heading visually close to that heading.

Suggested defaults:

```css
body {
  line-height: 1.6;
}

p {
  margin: 0 0 0.75rem;
}

h1 + p,
h2 + p,
h3 + p {
  margin-top: 0;
}
```

## Line Spacing

Word line-spacing values roughly translate to CSS as follows:

| Word Setting | CSS Equivalent | Use |
| --- | --- | --- |
| Single | `line-height: 1.2` | Tight headings |
| 1.15 | `line-height: 1.4` | Compact body text |
| 1.5 | `line-height: 1.6` | Comfortable body text |
| Double | `line-height: 2` | Academic or legal drafts |

Recommended body default: `line-height: 1.5` to `1.65`.

## Typography

The source document uses familiar Word-style fonts. For MarkLeaf, prefer portable system stacks unless a document style intentionally specifies a custom installed font.

Suggested defaults:

```css
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  color: #1a1a1a;
}
```

Notes:

- Word's Normal style is often 11-12pt. In browser-style rendering, `16px` or `1rem` is a better base size.
- Body text should be near-black, but not necessarily pure black.
- Maintain sufficient colour contrast for accessibility.

## Lists

Word list indentation maps to CSS padding.

Suggested defaults:

```css
ul,
ol {
  margin: 0 0 0.75rem;
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.35rem;
}

li > ul,
li > ol {
  margin-top: 0.25rem;
}

li p {
  margin-bottom: 0;
}
```

## Tables

Word tables use collapsed borders, modest cell padding, and clear header styling. The JKTS blue is a good table header colour.

Suggested defaults:

```css
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

th,
td {
  border: 1px solid #ccc;
  padding: 0.4rem 0.75rem;
}

thead th {
  background: #2E5E94;
  color: #fff;
}
```

## Print Styles

Use print rules to better match Word's pagination behaviour.

```css
@media print {
  @page {
    margin: 1in;
  }

  h2,
  h3 {
    break-after: avoid;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }
}
```

## Starter CSS

This starter block combines the recommendations above into a first-pass JKTS-inspired document style.

```css
body {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 2rem;
  color: #1a1a1a;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

h1 {
  color: #2E5E94;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 2rem 0 0.5rem;
}

h2 {
  color: #29A94F;
  font-size: 1.4rem;
  font-weight: 700;
  line-height: 1.25;
  margin: 1.5rem 0 0.4rem;
}

h3 {
  color: #2E5E94;
  font-size: 1.15rem;
  font-weight: 650;
  line-height: 1.3;
  margin: 1.2rem 0 0.3rem;
}

p {
  margin: 0 0 0.75rem;
}

ul,
ol {
  margin: 0 0 0.75rem;
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.35rem;
}

table {
  width: 100%;
  margin: 1rem 0;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ccc;
  padding: 0.4rem 0.75rem;
}

thead th {
  background: #2E5E94;
  color: #fff;
}

@media print {
  @page {
    margin: 1in;
  }

  h2,
  h3 {
    break-after: avoid;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }
}
```
Ok
