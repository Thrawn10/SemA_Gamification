---
name: spec-intake
description: How to process a very large specification document reliably without losing requirements. Use when reading, chunking, or re-reading docs/spec/SPEC.md, or when checking whether a requirement is covered.
---

# Spec intake method

A large spec cannot be held in one context. Work in a way that is resumable and verifiable.

## Chunking

1. List all headings with line numbers to get the outline:
   - bash: `grep -n '^#' docs/spec/SPEC.md`
   - PowerShell: `Select-String -Path docs/spec/SPEC.md -Pattern '^#'`
2. Read one top-level section at a time. After each section, append its requirements to
   `docs/spec/requirements.md` before moving on.
3. Keep a progress marker at the top of `requirements.md`:
   `Processed through: <section heading / line>`, so work can resume after a context reset.

## Requirement format

```markdown
### R-014 · Login form validation

- Area: Auth
- Feature folder: features/auth
- Type: functional
- Priority: must
- Source: SPEC.md §3.2 (lines 412-430)
- Statement: Email must be valid; password at least 8 characters; errors appear inline on blur.
- Acceptance:
  - [ ] Invalid email shows "<exact spec copy>" under the field
  - [ ] Submit is disabled while the request is pending
```

## Traceability checks

- Every requirement is in at least one task; every task cites requirement IDs.
- Quantities, copy, colours and timings are copied verbatim from the spec, with the source line
  range.
- When the spec contradicts itself, record both locations in `docs/spec/open-questions.md`.
- Mark anything inferred as `(assumed)`; never invent product behaviour.

## Re-reading during build

When implementing, open the cited `Source` line range in `docs/spec/SPEC.md` rather than relying on
the summary in `requirements.md`. The spec wins for product behaviour.
