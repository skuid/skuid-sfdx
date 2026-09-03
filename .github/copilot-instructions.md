# Copilot instructions for skuid-sfdx

An `sf` CLI plugin (oclif + TypeScript, **ESM**) with two commands:
`skuid page pull` and `skuid page push`. It moves Skuid page metadata between a
Salesforce org and the filesystem.

Full detail is in [`AGENTS.md`](../AGENTS.md). This file is the short version.

## Weight review and suggestions toward these three bug classes

They account for most of this repo's shipped defects.

1. **Undeclared dependencies.** A package imported but missing from
   `package.json` still resolves locally from a transitive copy, so tests pass
   while the published plugin is broken for consumers. This shipped as a
   customer-blocking bug. Flag any import whose package is not declared.
2. **Silent failure with exit code 0.** Pages once vanished from a push while it
   reported success. Treat a swallowed error, a bare `return` in a `catch`, or
   success-shaped output on a failed operation as a defect, not a style choice.
3. **Code that looks correct but cannot work.** An audit helper that reported
   "0 advisories" when the audit never ran; a script named `check`, silently
   shadowed by a yarn builtin. Ask whether a guard can actually fail.

## Constraints that suggestions must respect

- **ESM.** `"type": "module"`. Relative imports need explicit `.js` extensions
  even from `.ts` files. There is no `__dirname` — use `import.meta.dirname`.
  Some CommonJS dependencies (e.g. `vkbeautify`) expose nothing through named
  imports and must be reached via their default export.
- **Node >= 22.19.0**, from `undici` via `@salesforce/core`. Do not suggest
  syntax or APIs that require newer, or workarounds for older.
- **Page order is load-bearing.** Push payloads and log output must be
  deterministic. `readPageFiles.ts` sorts glob results explicitly; glob 9+
  returns filesystem traversal order, so do not remove that sort.
- **Never suggest `npm version` or `oclif readme`.** `oclif readme` writes the
  running machine's default org username into the public README and destroys the
  hand-written command reference. There is deliberately no `version` npm script.
- **Three page document roots** are valid and all must stay supported:
  `<skuidpage>` (v1), `<skuid__page>` (v2), `<NtxPage>` (v3). Unrecognized roots
  are reported and excluded, never dropped silently.
- `apiVersion` (v1/v2/v3) and `formatVersion` (ink1/ink2) are **orthogonal** —
  a v3 page is not a flavour of v2/ink2.

## Verifying

- `yarn test` — mocha then eslint.
- `yarn harden` — the four extra CI checks. **Required before claiming any
  dependency change works**, because `yarn test` resolves against the repo's own
  `node_modules` and never exercises the packaged output.
- If you add a check, prove it fails by reproducing the real bug, not a
  stand-in.

## Conventions

Commit subjects start with the work item: `AB#545951: Fix ...` — ADO links
commits and PRs from that automatically.
