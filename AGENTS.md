# Working in skuid-sfdx

An `sf` CLI plugin (oclif + TypeScript, ESM) with two commands: `skuid page pull`
and `skuid page push`. Canonical instructions for AI agents. `CLAUDE.md` and
`.github/copilot-instructions.md` point here; keep the detail in this file.

## Before you trust a local result

These have each produced a confidently wrong answer. They are invisible from
reading the code.

- **`yarn install` exits 0 when it fails.** If your own `~/.npmrc` references an
  unset `${VAR}`, yarn prints an error, installs nothing, and returns success.
  Always confirm: `ls node_modules > /dev/null && echo ok`. Fix by exporting the
  variables it names (empty values are fine) — this project needs no tokens.
- **A checkout nested inside another checkout of this repo borrows its
  dependencies.** Node resolves by walking *up* the directory tree, so a git
  worktree under `.claude/worktrees/` silently uses the parent's `node_modules`.
  Tests then pass using packages that are not declared in `package.json`.
  Deleting `node_modules` locally does not help. Verify with
  `yarn check:isolated`, which copies the tracked files somewhere clean.
- **`gh run list --branch master` returns Dependabot runs, not CI.** Those are
  a separate workflow and are often failing for unrelated reasons. Always filter:
  `gh run list --workflow ci.yml --branch master`.
- **ESLint reports every file "ignored by default"** when the checkout path
  contains a dot-directory. Use `--no-ignore --resolve-plugins-relative-to .`.
- **Node must be >= 22.19.0.** The floor comes from `undici`, via
  `@salesforce/core`. A local 22.x is often too old; use 24.

## Never do these

- **`npm version`, or `oclif readme`.** `oclif readme` renders the resolved flag
  defaults from the machine it runs on, which writes *your default org username*
  into the public README. It also destroys the hand-written command reference.
  There is deliberately no `version` npm script. `yarn check:readme` blocks both,
  but do not reach for them.
- **Do not re-add the `<!-- usage -->` / `<!-- commands -->` markers to
  README.md.** Removing them is what made `oclif readme` harmless.
- **Do not bump `glob` without keeping the explicit sort** in
  `src/helpers/readPageFiles.ts`. glob 7 sorted its matches; 9+ returns
  filesystem traversal order. Page order is load-bearing — push payloads and log
  output must be deterministic — so ordering is enforced in our code, not
  inherited from the library.

## Verify before you claim

- `yarn test` — mocha then eslint (30 tests).
- `yarn harden` — the four checks CI runs beyond the suite: undeclared imports,
  packed-artifact load, dependency advisories, README/manifest drift. **Run this
  before claiming any dependency change works.** `yarn test` cannot catch those:
  it resolves against the repo's own `node_modules` and never exercises the
  packaged output.
- `yarn check:isolated` — the suite in a clean copy outside this checkout.
- The mocha timeout is 60s on purpose. It covers hooks, the `beforeEach` hooks do
  real I/O, and the Windows CI legs run ~100x slower than local. Lowering it
  reintroduces intermittent `beforeEach` timeouts on Windows only.

**If you add a check, prove it fails.** Reproduce the actual bug, not a
convenient stand-in. A check that passes its own test while being blind to the
case it exists for is worse than no check — that has happened here repeatedly.

## Domain model: page generations

A Skuid page is two files: `<name>.json` (metadata) and `<name>.xml` (layout).
Three document roots, one per generation:

| Root | Generation |
| --- | --- |
| `<skuidpage>` | v1 |
| `<skuid__page>` | v2 |
| `<NtxPage>` | v3 |

**`apiVersion` and `formatVersion` are orthogonal axes.** `apiVersion` is
`v1`/`v2`/`v3`; `formatVersion` is `ink1`/`ink2`, where `ink2` means the page was
authored in Page Designer. A v3 page carries `apiVersion: "v3"` and often no
`formatVersion` at all. Work item AB#540345 states that "v3 documents are
v2/`ink2` pages" — that is contradicted by real orgs; do not rely on it.

Unrecognized roots are **reported and excluded**, never silently dropped. Silent
exclusion with exit code 0 was a real bug (v3 pages never reached the org while
push reported success), so preserve that reporting: `push` warns per file and
adds `skippedFiles` to `--json` output. A file that is not a Skuid page at all is
still ignored quietly, so broad globs stay usable.

## The recurring bug classes here

Three patterns account for most of this repo's shipped defects. Weight your
review and your own changes accordingly.

1. **Undeclared dependencies.** `glob` was imported and never declared; it
   resolved from a transitive copy, so tests passed while the published plugin
   was broken for consumers (#29). The eslint config and `sinon` were the same
   shape. Consumers only get what `package.json` declares.
2. **Silent failure with exit code 0.** The original v3 bug, and the reason
   `push` now reports skipped files. Treat any swallowed error, bare `return` in
   a `catch`, or success-shaped output on a failed operation as suspect.
3. **Configuration that looks right but cannot work.** Branch protection
   requiring renamed job names; a script named `check`, shadowed by a yarn
   builtin; an audit helper reporting "0 advisories" when audit never ran.

## Codebase

- `src/commands/skuid/page/{pull,push}.ts` — one file per command.
- `src/helpers/` — `readPageFiles` (glob + validation), `xml` (format/condense/
  validate roots), `jsonStringify` (stable key order), `param`.
- `test/` mirrors `src/`. `scripts/*.mjs` are the hardening checks.

ESM constraints when editing: relative imports need explicit `.js` extensions
even from `.ts`; there is no `__dirname` (use `import.meta.dirname`); some
CommonJS dependencies expose nothing through named imports and must be reached
via their default export (`vkbeautify` is one).

## This repository is public

Everything you write into a commit message, PR title, PR body or review comment
is published. Treat those as public documentation, not as a work log.

- **Reference work items by ID only.** `AB#545951:` in a commit subject is fine
  and ADO links it automatically. Do **not** quote a work item's contents,
  restate internal discussion, or summarise what QA reported -- the public repo
  records *what* changed, the tracker records *why* and *who said what*.
- **Never include real environment data.** No org usernames or logins, no org
  names, no real page, record or module names, no inventory counts. Use the
  placeholders the docs already use (`myOrg@example.com`, `SalesApp`), and when
  you need to describe a real investigation, describe the shape of the data
  rather than the data.
- **Do not paste tool output verbatim** without reading it first. `--help`
  renders the resolved default org of whoever ran it; `sf org list`, `sf plugins`
  and error traces carry usernames and absolute paths. This has already happened:
  a commit message documenting a guard *against* leaking an org username leaked
  one by quoting the offending line.
- **Name unreleased formats neutrally; do not narrate the roadmap.** The code has
  to match `<NtxPage>`, so listing it as a supported document root is
  unavoidable and it ships in the npm tarball anyway. Internal codenames,
  feature-flag names, release versions and repository names are a different
  matter and belong nowhere near this repo.

If you have already written something and then notice it, say so. PR bodies and
comments are editable; merged commit messages effectively are not, because
rewriting public history needs a force-push.

## Conventions

- Commit subjects start with the work item: `AB#545951: Fix ...`. ADO links
  commits and PRs automatically from that. Area path
  `Nintex\Nintex Apps\Argonauts`.
- Releases are manual and there is no automation: bump `version`, merge, then
  `git tag <version> && git push origin <version>` and `npm publish` (needs npm
  2FA). `npm publish` runs `prepack`, so no manual build step.
