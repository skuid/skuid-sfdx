skuid-sfdx
==========

`sf` CLI plugin for managing Skuid metadata

[![Version](https://img.shields.io/npm/v/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![CI/CD](https://github.com/skuid/skuid-sfdx/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/skuid/skuid-sfdx/actions/workflows/ci.yml)
[![Downloads/week](https://img.shields.io/npm/dw/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![License](https://img.shields.io/npm/l/skuid-sfdx.svg)](https://github.com/skuid/skuid-sfdx/blob/master/package.json)

- [Installation](#installation)
- [Usage](#usage)
- [Command reference](#command-reference)
- [Contributing](#contributing)

# Installation

First, ensure you have [installed the `sf` CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm).

**Requirements:** Node.js 22.19.0 or newer. Recent `sf` CLI releases bundle their
own Node runtime (24.x at the time of writing), so installing the plugin into
`sf` satisfies this automatically. `0.5.x` was the last release supporting
Node 18 and 20.

```sh-session
echo 'y' | sf plugins install skuid-sfdx
```

**Note:** installing a plugin prompts you to trust it. The `echo 'y'` answers
that prompt for you. Only Salesforce can sign plugins, so third-party plugins
are always untrusted and always prompt.

In CI, either pipe `y` as above or add the plugin to your list of trusted
plugins.

# Usage

## Pulling pages out of an org

`sf skuid page pull` writes **two files per page** into an output directory:

- a `.xml` file containing the page's layout
- a `.json` file containing the page's metadata

```sh-session
$ sf skuid page pull
Wrote 85 pages to skuidpages

$ sf skuid page pull --module SamplePages --dir pages/sample
Wrote 4 pages to pages/sample
```

Page XML is pretty-printed so that changes are reviewable line-by-line in
source control. Tabs are used by default; set `SKUID_XML_INDENT` to change it,
e.g. `export SKUID_XML_INDENT="  "` for two spaces.

## Pushing pages into an org

`sf skuid page push` takes file paths or glob patterns. For each `.json` or
`.xml` path it finds, it pushes the page described by that `.json`/`.xml` pair.

```sh-session
$ sf skuid page push salesapp/*Foo*
3 Pages successfully pushed.
```

### Pages that get skipped

A file that isn't a Skuid page at all is ignored silently, so broad patterns
like `**/*` are safe to use.

A file that *is* a valid page definition but whose XML has an unrecognized
document root is **reported and excluded**:

```sh-session
$ sf skuid page push mypages/*
Warning: Skipping Mystery.json: Invalid Skuid Page XML file. Expected the
document root to be one of: <skuidpage>, <skuid__page>, <NtxPage>
Found 2 matching pages within current directory, pushing changes to org...
2 Pages successfully pushed.
```

With `--json`, those files also appear in a `skippedFiles` array. This matters
because such pages used to be dropped with no error and exit code 0, which made
a partial push indistinguishable from a complete one.

The three recognized document roots correspond to the page generations:
`<skuidpage>` for v1, `<skuid__page>` for v2, and `<NtxPage>` for v3.

# Command reference

Run `sf skuid page pull --help` or `sf skuid page push --help` for the
authoritative flag list.

## `sf skuid page pull`

Pull Skuid Pages from a Salesforce org into a local directory.

| Flag | Description |
| --- | --- |
| `-d, --dir=<value>` | Output directory to write pages to. Defaults to `skuidpages`. |
| `-m, --module=<value>` | Module name(s), separated by a comma. |
| `-p, --page=<value>` | Page name(s), separated by a comma. |
| `--nomodule` | Retrieve only those pages that do not have a module. |
| `-o, --target-org=<value>` | Username or alias of the target org. |
| `--api-version=<value>` | Override the API version used for API requests. |
| `--json` | Format output as JSON. |
| `--flags-dir=<value>` | Import flag values from a directory. |

```sh-session
$ sf skuid page pull --target-org myOrg@example.com --module CommunityPages
$ sf skuid page pull --nomodule
$ sf skuid page pull --page Page1,Page2,Page3 --dir newpages
```

## `sf skuid page push`

Push Skuid Pages from a directory to Skuid. Accepts any number of file paths or
glob patterns as arguments; with none, it matches `**/*.json`.

| Flag | Description |
| --- | --- |
| `-d, --dir=<value>` | Source directory in which page files reside. |
| `-o, --target-org=<value>` | Username or alias of the target org. |
| `--api-version=<value>` | Override the API version used for API requests. |
| `--json` | Format output as JSON. Includes `skippedFiles` when any page was excluded. |
| `--flags-dir=<value>` | Import flag values from a directory. |

```sh-session
$ sf skuid page push --target-org myOrg@example.com *SalesApp*
$ sf skuid page push skuidpages/SalesApp*
$ sf skuid page push --dir salespages SalesApp*
$ sf skuid page push pages/SalesAppHome.xml pages/CommissionDetails.xml
$ sf skuid page push **/*.xml
```

# Contributing

## Setup

Clone the repo and link the plugin into `sf` so it appears in your command list:

```sh-session
git clone https://github.com/skuid/skuid-sfdx.git
cd skuid-sfdx
yarn
yarn prepack
sf plugins link .
```

`yarn prepack` is needed before linking because the plugin runs from compiled
output in `lib/`, not from `src/`.

## Node version

`.nvmrc` pins local development to Node 24. If you use
[nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the repo root.

`package.json` declares `engines.node` as `>=22.19.0` -- the floor comes from
`undici`, by way of `@salesforce/core`. CI runs the suite on Node 22, 24 and 26
across Linux and Windows, so anything you land needs to work on all six
combinations.

## The plugin is ESM

`package.json` sets `"type": "module"`. This is forced by
`@salesforce/sf-plugins-core`, which is ESM-only from v7 onward. Practical
consequences when editing:

- Relative imports need explicit `.js` extensions, even from `.ts` files.
- There is no `__dirname`; use `import.meta.dirname`.
- Some CommonJS dependencies expose nothing through named imports and must be
  reached through their default export.

## Troubleshooting: `Failed to replace env in config`

If `yarn` prints something like:

```
error Error: Failed to replace env in config: ${GITHUB_ACCESS_TOKEN}
```

then **your install did not happen**. This is not a problem with this repo --
it comes from your own `~/.npmrc`. Yarn eagerly expands every `${VAR}`
reference it finds there, even for registries this project never contacts, and
it fails the whole install if any of them is unset.

> :warning: **Yarn still exits 0 when this happens.** The error scrolls past,
> `node_modules` is left missing or incomplete, and scripts appear to succeed.
> After installing, confirm you actually got dependencies:
> `ls node_modules > /dev/null && echo ok`.

This project resolves everything from the public npm registry and needs no
token. Either export the variables your `~/.npmrc` references (any value works,
including an empty one):

```sh-session
export GITHUB_ACCESS_TOKEN=""
yarn
```

or remove the unused registry lines from `~/.npmrc`.

## Orientation

Each command lives in a file under `src/commands`, in a directory structure
matching its namespace -- `skuid page pull` is `src/commands/skuid/page/pull.ts`.
Shared logic lives in `src/helpers`, and types in `src/types`.

## Tests

Tests live under `test/`, mirroring the `src/` layout.

```sh-session
yarn test
```

That runs mocha and then eslint (via the `posttest` lifecycle script) -- the
same thing CI runs.

> :warning: **Verifying a dependency change needs a clean checkout.** If your
> working copy sits inside another checkout of this repo -- a git worktree, for
> example -- Node resolves packages by walking *up* the directory tree, so tests
> can pass locally using a dependency that is not declared in `package.json`,
> then fail in CI. Removing `node_modules` locally does not help. To check a
> dependency change, copy the tracked files somewhere outside the parent
> checkout, install there, and run the suite.

## Updating docs

The command reference above is maintained **by hand**. Do not run
`oclif readme` to regenerate it: it renders the resolved flag defaults from
whatever machine it runs on, which writes your own default org username into
this public file. It also overwrites the hand-written Usage prose. For the same
reason there is no `version` npm script, so `npm version` is safe to run.

When you add or change a flag, update the table by hand from
`sf skuid page <command> --help`.

## Releasing

There is no release automation. Bump `version` in `package.json`, merge, then:

```sh-session
git tag <version> && git push origin <version>
npm publish
```

`npm publish` runs `prepack`, which builds `lib/` and the oclif manifest, so no
manual build step is needed.
