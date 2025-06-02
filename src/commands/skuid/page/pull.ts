/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-param-reassign */
/* eslint-disable unicorn/prefer-node-protocol */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Messages } from '@salesforce/core';
import { Flags, orgApiVersionFlagWithDeprecations, requiredOrgFlagWithDeprecations, SfCommand } from '@salesforce/sf-plugins-core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { stringify } from '../../../helpers/jsonStringify';
import { param } from '../../../helpers/param';
import { formatXml } from '../../../helpers/xml';
import {
  PullQueryParams,
  SkuidPage
} from '../../../types/types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-pull');

export default class Pull extends SfCommand<AnyJson> {

  public static readonly summary = messages.getMessage('commandDescription');
  public static readonly description = messages.getMessage('commandDescription');

  public static readonly examples = [
    '$ sf skuid:page:pull --target-org myOrg@example.com --module CommunityPages',
    '$ sf skuid:page:pull --nomodule',
    '$ sf skuid:page:pull --page Page1,Page2,Page3 --dir newpages'
    ];

  public static readonly flags = {
    // flag with a value (-n, --name=VALUE)
    module: Flags.string({ char: 'm', summary: messages.getMessage('flags.module.summary') }),
    page: Flags.string({ char: 'p', summary: messages.getMessage('flags.page.summary') }),
    nomodule: Flags.boolean({ summary: messages.getMessage('flags.nomodule.summary') }),
    dir: Flags.string({ char: 'd', summary: messages.getMessage('flags.dir.summary') }),
    'target-org': requiredOrgFlagWithDeprecations,
    'api-version': orgApiVersionFlagWithDeprecations
  };

  public async run(): Promise<AnyJson> {
    const { flags } = await this.parse(Pull);
    const {
      json,
      module,
      nomodule,
      page,
      'api-version': apiVersion
    } = flags;

    let dir = flags.dir as string;
    if (!dir) dir = 'skuidpages';

    const queryParams = {} as PullQueryParams;

    if (nomodule) queryParams.nomodule = true;
    if (typeof module === 'string') queryParams.module = module;
    if (typeof page === 'string') queryParams.page = page;

    // when you get a Connection, pass the api-version flag to it
    // that way, if the user specified an api version, the Connection is set
    const conn = flags['target-org'].getConnection(apiVersion);

    let resultJSON: string = await conn.apex.get(`/skuid/api/v1/pages?${param(queryParams)}`);

    // If json requested, just return the result,
    // but trim off leading _ from the page names,
    // which will happen for pages not in a module
    if (json) {
      const result = JSON.parse(resultJSON) as JsonMap;
      Object.keys(result).forEach(pageName => {
        const pageResult = result[pageName];
        const xmlKey = pageResult && Object.prototype.hasOwnProperty.call(pageResult, 'body') ? 'body' : 'content';
        if (pageResult) {
          if (typeof pageResult[xmlKey] === 'string') {
            pageResult[xmlKey] = this.beautifyXml(pageResult[xmlKey] as string, pageName);
          }
        }
        if (pageName.startsWith('_')) {
          result[pageName.substring(1)] = pageResult;
          delete result[pageName];
        }
        const newName = pageName.replace(/[/\\]/g, '');
        if (pageName !== newName) {
          result[newName] = result[pageName];
          delete result[pageName];
        }
      });
      return {
        pages: result
      };
    }

    // Otherwise, write a .json and .xml file in the specified output directory for every retrieved file.
    if (typeof dir === 'string' && !existsSync(dir)) mkdirSync(dir);

    const skuidPages = JSON.parse(resultJSON) as Map<string, SkuidPage> ;
    // Clear out heap
    resultJSON = '';
    let numPages: number = 0;

    (Object.entries(skuidPages) as Array<[string, SkuidPage]>).forEach(([ pageName, skuidPage ]) => {
      numPages++;
      // Trim leading _ off of the name, which will happen for pages not in a module
      if (pageName.startsWith('_')) pageName = pageName.substring(1);
      pageName = pageName.replace(/[/\\]/g, '');
      const pageBasePath: string = resolve(dir, pageName);
      const xml: string|undefined = skuidPage.body ?? skuidPage.content;
      if (xml) {
        writeFileSync(pageBasePath + '.xml', this.beautifyXml(xml, pageName), 'utf8');
      }
      delete skuidPage.body;
      delete skuidPage.content;
      // Remove all null props
      for (const prop in skuidPage) {
        if (skuidPage[prop] === null ) delete skuidPage[prop];
      }
      // Serialize using a stable sorting algorithm
      const serializedPage = stringify(skuidPage);
      if (serializedPage) {
        writeFileSync(pageBasePath + '.json', serializedPage, 'utf8');
      }
      // Clear out memory from our response
      delete skuidPages[pageName];
    });

    this.log('Wrote ' + numPages + ' pages to ' + dir);

    return {};
  }

  private beautifyXml(xml: string, pageName: string): string {
    let formattedXml: string;
    try {
      formattedXml = formatXml(xml);
    } catch (err) {
      this.error(`Page ${pageName} has invalid XML.`);
    }
    return formattedXml;
  }
}
