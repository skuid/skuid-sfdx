skuid-sfdx
==========

SFDX plugin for managing Skuid metadata

[![Version](https://img.shields.io/npm/v/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![CI/CD](https://github.com/skuid/skuid-sfdx/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/skuid/skuid-sfdx/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/skuid/skuid-sfdx/branch/master/graph/badge.svg)](https://codecov.io/gh/skuid/skuid-sfdx)
[![Downloads/week](https://img.shields.io/npm/dw/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![License](https://img.shields.io/npm/l/skuid-sfdx.svg)](https://github.com/skuid/skuid-sfdx/blob/master/package.json)

<!-- toc -->
* [Installation](#installation)
* [Usage](#usage)
* [Commands](#commands)
* [Contributing](#contributing)
<!-- tocstop -->

<!-- install -->
# Installation

First, ensure you have [installed `sf cli`](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm).

**Requirements:** Node.js 22.19.0 or newer. Recent `sf` CLI releases bundle their
own Node (24.x at time of writing), so installing the plugin into `sf` satisfies
this automatically. Version `0.5.x` was the last release supporting Node 18 and 20.

Now, install the skuid-sfdx plugin:

```sh-session
echo 'y' | sf plugins:install skuid-sfdx
```

**Note**: When you install an `sfdx` plugin, it will ask you to trust the plugin by typing `y`. The `echo 'y'` above skips that step as a convenience. 

Why do this? Currently, only Salesforce's internal developers can sign plugins. Because other plugin creators *cannot* sign their SFDX plugins so they are "trusted," the `echo 'y'` is necessary for the time being.

To use `skuid-sfdx` in a CI environment, you will either need to auto-trust the plugin with `echo 'y'` as above or add the plugin to a whitelist of trusted SFDX plugins, [as described in the "CI and CD Impact" section of this Salesforce blog post](https://developer.salesforce.com/blogs/2017/10/salesforce-dx-cli-plugin-update.html).

<!-- installstop -->

<!-- usage -->
# Usage

To pull Skuid Pages from a Salesforce org to the filesystem, use the `skuid page pull` command. You can use various arguments to specify which Pages in the org you want to pull, and you can output the pages to a directory of your choice.

For each Page, two files will be written:

  - an XML file containing the Page's layout
  - a JSON file containing metadata about the Page

### Example

```sh-session

$ sf skuid page pull
Wrote 85 pages to skuidpages

$ sf skuid page pull --module SamplePages --dir pages/sample
Wrote 4 pages to pages/sample
```

Page XML will be pretty-printed, with indentation automatically added, to make it easy to review and commit changes to Skuid Pages line-by-line to source control. (Note: tabs are used for indentation by default, but if you would like to use a different indentation, you can set the `SKUID_XML_INDENT` environment variable, e.g. `export SKUID_XML_INDENT="  "` to use 2 spaces instead of tabs.)

Going the other direction, to move Skuid Pages from the filesystem up to a Salesforce org, use the `skuid page push` command. You can use file glob patterns to specify which Pages in your filesystem that you want to push, for example:

```sh-session

$ sf skuid page push salesapp/*Foo*
3 Pages successfully pushed.

```

<!-- usagestop -->

<!-- commands -->
# Commands
* `sf skuid page pull`

```
Pull Skuid Pages from a Salesforce org into a local directory

USAGE
  $ sf skuid page pull [-m <string>] [-p <string>] [--nomodule] [-d <string>] [-o <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --dir=dir                                                                     Output directory to write pages to.
  -m, --module=module                                                               Module name(s), separated by a comma.
  -p, --page=page                                                                   Page name(s), separated by a comma.
  -o, --target-org                                                                  alias for the target org, replaces the previous -u flag,
  --apiversion=apiversion                                                           override the api version used for api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for this command invocation
  --nomodule                                                                        Retrieve only those pages that do not have a module

EXAMPLES
  $ sf skuid page pull -o myOrg --module CommunityPages
  $ sf skuid page pull --nomodule
  $ sf skuid page pull --page Page1,Page2,Page3 --dir newpages

```

* `sf skuid page push`

```
Push Skuid Pages from a directory to Skuid.

USAGE
  $ sf skuid page push [-d <string>] [-o <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --dir=dir                                                                     Source directory in which page files reside.
  -o, --target-org                                                                  alias for the target org, replaces the previous -u flag,
  --apiversion=apiversion                                                           override the api version used for api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for this command invocation

EXAMPLES
  $ sf skuid page push -o myOrg
  $ sf skuid page push skuidpages/*
  $ sf skuid page push -d=salespages SalesApp*
  $ sf skuid page push pages/SalesAppHome.xml pages/CommissionDetails.xml
  $ sf skuid page push **/*
```

<!-- commandsstop -->

<!-- contributing -->
# Contributing

To get started with contributing to this plugin locally, clone the repo and then link the plugin to sfdx so that it will appear within your sfdx commands list:

## Setup

```sh-session
git clone https://github.com/skuid/skuid-sfdx.git
cd skuid-sfdx
yarn
sf plugins:link
```

### Node version

`.nvmrc` pins local development to Node 22 (an active LTS line). If you use
[nvm](https://github.com/nvm-sh/nvm), run `nvm use` in the repo root.

`package.json` declares support for Node >= 18, and CI runs the test suite on
Node 18, 22, 24 and 26 across Linux and Windows. Anything you land needs to
work on all of them.

### Troubleshooting: `Failed to replace env in config`

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
token. To fix it, either export the variables your `~/.npmrc` references
(any value works, including an empty one):

```sh-session
export GITHUB_ACCESS_TOKEN=""
yarn
```

or remove the unused registry lines from `~/.npmrc`.

## Orientation

Logic for each command (e.g. `skuid page pull`) is defined within a specific file under `src/commands`, within a folder structure corresponding to that plugin's namespace (e.g. the `pull` command is within `skuid/page` directory).

## Tests

Tests are located within a matching directory under `test/commands`.

To run tests:

```sh-session
yarn test
```

That runs mocha and then eslint (via the `posttest` lifecycle script) -- the
same thing CI runs.

When adding / modifying commands, please update the README with the latest output of running the command's `--help`.

<!-- contributingstop -->
