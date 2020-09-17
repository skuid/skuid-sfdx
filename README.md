skuid-sfdx
==========

SFDX plugin for managing Skuid metadata

[![Version](https://img.shields.io/npm/v/skuid-sfdx.svg)](https://npmjs.org/package/skuid-sfdx)
[![CircleCI](https://circleci.com/gh/skuid/skuid-sfdx/tree/master.svg?style=shield)](https://circleci.com/gh/skuid/skuid-sfdx/tree/master)
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

First, ensure you have [installed `sfdx`](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm).

Now, install the skuid-sfdx plugin:

```sh-session
echo 'y' | sfdx plugins:install skuid-sfdx
```

**Note**: When you install an `sfdx` plugin, it will ask you to trust the plugin by typing `y`. The `echo 'y'` above skips that step as a convenience. 

Why do this? Currently, only Salesforce's internal developers can sign plugins. Because other plugin creators *cannot* sign their SFDX plugins so they are "trusted," the `echo 'y'` is necessary for the time being.

To use `skuid-sfdx` in a CI environment, you will either need to auto-trust the plugin with `echo 'y'` as above or add the plugin to a whitelist of trusted SFDX plugins, [as described in the "CI and CD Impact" section of this Salesforce blog post](https://developer.salesforce.com/blogs/2017/10/salesforce-dx-cli-plugin-update.html).

<!-- installstop -->

<!-- usage -->
# Usage

To pull Skuid Pages from a Salesforce org to the filesystem, use the `skuid:page:pull` command. You can use various arguments to specify which Pages in the org you want to pull, and you can output the pages to a directory of your choice.

For each Page, two files will be written:

  - an XML file containing the Page's layout
  - a JSON file containing metadata about the Page

### Example

```sh-session

$ sfdx skuid:page:pull
Wrote 85 pages to skuidpages

$ sfdx skuid:page:pull --module SamplePages --dir pages/sample
Wrote 4 pages to pages/sample
```

Page XML will be pretty-printed, with indentation automatically added, to make it easy to review and commit changes to Skuid Pages line-by-line to source control. (Note: tabs are used for indentation by default, but if you would like to use a different indentation, you can set the `SKUID_XML_INDENT` environment variable, e.g. `export SKUID_XML_INDENT="  "` to use 2 spaces instead of tabs.)

Going the other direction, to move Skuid Pages from the filesystem up to a Salesforce org, use the `skuid:page:push` command. You can use file glob patterns to specify which Pages in your filesystem that you want to push, for example:

```sh-session

$ sfdx skuid:page:push salesapp/*Foo*
3 Pages successfully pushed.

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
  -d, --dir=dir                                                                     Output directory to write pages to.
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
  $ sfdx skuid:page:pull --page Page1,Page2,Page3 --dir newpages

```

* `sfdx skuid:page:push`

```
Push Skuid Pages from a directory to Skuid.

USAGE
  $ sfdx skuid:page:push [-d <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --dir=dir                                                                     Source directory in which page files reside.
  -u, --targetusername=targetusername                                               username or alias for the target org; overrides default target org
  --apiversion=apiversion                                                           override the api version used for api requests made by this command
  --json                                                                            format output as json
  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for this command invocation

EXAMPLES
  $ sfdx skuid:page:push --targetusername myOrg@example.com
  $ sfdx skuid:page:push skuidpages/*
  $ sfdx skuid:page:push -d=salespages SalesApp*
  $ sfdx skuid:page:push pages/SalesAppHome.xml pages/CommissionDetails.xml
  $ sfdx skuid:page:push **/*
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
