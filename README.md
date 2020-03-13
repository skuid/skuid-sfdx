skuid-sfdx
==========

SFDX plugin for managing Skuid metadata

[![Version](https://img.shields.io/npm/v/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![CircleCI](https://circleci.com/gh/skuid/skuid-sfdx/tree/master.svg?style=shield)](https://circleci.com/gh/skuid/skuid-sfdx/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/skuid/skuid-sfdx?branch=master&svg=true)](https://ci.appveyor.com/project/heroku/skuid-sfdx/branch/master)
[![Codecov](https://codecov.io/gh/skuid/skuid-sfdx/branch/master/graph/badge.svg)](https://codecov.io/gh/skuid/skuid-sfdx)
[![Greenkeeper](https://badges.greenkeeper.io/skuid/skuid-sfdx.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/skuid/skuid-sfdx/badge.svg)](https://snyk.io/test/github/skuid/skuid-sfdx)
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
```sh-session
npm install -g skuid-sfdx
sfdx plugins:install skuid-sfdx
```
<!-- installstop -->

<!-- usage -->
# Usage
```sh-session

$ sfdx skuid:page:pull
Wrote 85 pages to skuidpages

$ sfdx skuid:page:pull --module SamplePages --outputdir pages/sample
Wrote 4 pages to pages/sample

...
```
<!-- usagestop -->

<!-- commands -->
# Commands
* `sfdx skuid:page:pull`

```
Pull Skuid Pages from a Salesforce org into a local directory

USAGE
  $ sfdx skuid:page:pull [-m <string>] [-p <string>] [--nomodule] [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         Output directory to write pages to.
  -m, --module=module                                                               Module name(s), separated by a comma.
  -p, --page=page                                                                   Page name(s), separated by a comma.
  -u, --targetusername=targetusername                                               username or alias for the target org; overrides default target org
  --apiversion=apiversion                                                           override the api version used for api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for this command invocation
  --nomodule                                                                        Retrieve only those pages that do not have a module

EXAMPLES
  $ sfdx skuid:page:pull --targetusername myOrg@example.com --module CommunityPages
  $ sfdx skuid:page:pull --nomodule
  $ sfdx skuid:page:pull --page Page1,Page2,Page3 --outputdir newpages

```
<!-- commandsstop -->

<!-- contributing -->
# Contributing

To get started with contributing to this plugin locally, clone the repo and then link the plugin to sfdx so that it will appear within your sfdx commands list:

## Setup

```sh-session
git clone https://github.com/skuid/skuid-sfdx.git
cd skuid-sfdx
sfdx plugins:link
```

## Orientation

Logic for each command (e.g. `skuid:page:pull`) is defined within a specific file under `src/commands`, within a folder structure corresponding to that plugin's namespace (e.g. the `pull` command is within `skuid/page` directory).

## Tests

Tests are located within a matching directory under `test/commands`.

To run tests: 

```sh-session
npm test
```

When adding / modifying commands, please update the README with the latest output of running the command's `--help`.

<!-- contributingstop -->