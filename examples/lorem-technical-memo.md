# Technical Memo: Lorem Ipsum Workflow

**Author:** MarkLeaf Example  
**Date:** 2026-05-23  
**Status:** Draft

## Summary

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer non arcu at
urna commodo bibendum. Donec facilisis, neque sed volutpat sagittis, erat
lectus efficitur justo, vitae cursus neque ipsum non justo.

The purpose of this memo is to provide a practical Markdown document for
testing MarkLeaf's editor, preview, sidecar metadata, and export workflows.

## Background

Praesent tincidunt, magna in tincidunt porttitor, risus sem bibendum neque, at
tempor mauris lorem vel lorem. Sed nec urna posuere, feugiat justo sed, finibus
nibh. Curabitur eget neque id nibh malesuada varius.

> A good working document should remain readable as plain Markdown while still
> rendering cleanly in preview and export modes.

## Requirements

- Preserve the Markdown file as the source of truth.
- Support external edits from scripts or AI tools.
- Render a clean split preview.
- Save document-specific settings in a sidecar file.
- Export to professional document formats in later phases.

## Open Tasks

- [x] Create an Electron shell.
- [x] Add native open and save flows.
- [x] Add CodeMirror editing.
- [ ] Complete settings and sidecar schema.
- [ ] Validate PDF and DOCX export quality.

## Risk Table

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Export output differs from preview | Medium | High | Validate export pipeline early |
| External edits conflict with local edits | Medium | Medium | Clear reload and conflict prompts |
| Markdown extensions reduce portability | Low | Medium | Keep extensions explicit |

## Example Code

```js
const documentState = {
  mode: "split",
  style: "technical-memo",
  autosave: true
};
```

## Conclusion

Aliquam erat volutpat. Maecenas hendrerit, nisi non malesuada pellentesque,
turpis tortor gravida neque, vitae dapibus justo lorem at augue.
