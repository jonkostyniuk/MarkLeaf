# Meeting Notes: MarkLeaf Lorem Review

## Details

- **Date:** 2026-05-23
- **Attendees:** Alpha, Beta, Gamma
- **Topic:** Editor workflow review

## Agenda

1. Review current Markdown editing workflow.
2. Test external file reload.
3. Check preview styling.
4. Capture follow-up issues.

## Notes

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae neque vel
urna volutpat commodo. Integer porttitor lectus sed mauris cursus, a porttitor.

### Discussion

- The editor should feel immediate and predictable.
- The preview should update without distracting layout shifts.
- The sidecar file should be useful but never required to read the Markdown.

### Decisions

| Decision | Owner | Status |
| --- | --- | --- |
| Use Electron shell | Shared | Confirmed |
| Use CodeMirror for Markdown mode | Codex | Confirmed |
| Add settings panel next | Shared | Pending |

## Action Items

- [ ] Test save-as flow with a copied example file.
- [ ] Edit this document externally and reload in MarkLeaf.
- [ ] Confirm sidecar metadata contents after save.
- [ ] Add export fixture once PDF/DOCX spike begins.

## Parking Lot

> Future work may include Word-lite editing, Mermaid rendering, and export
> templates, but these should not distract from the first reliable MVP path.
