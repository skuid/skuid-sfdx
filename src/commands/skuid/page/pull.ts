import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { AnyJson } from '@salesforce/ts-types';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from '../../../helpers/jsonStringify';
import { param } from '../../../helpers/param';

import { formatXml } from '../../../helpers/xml';
import {
  PullQueryParams,
  SkuidPage
} from '../../../types/types';

interface JsonResponse {
  [pageName:string]: SkuidPage;
};

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-pull');

export default class Pull extends SfCommand<AnyJson> {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ sf skuid:page:pull --targetusername myOrg@example.com --module CommunityPages',
  '$ sf skuid:page:pull --nomodule',
  '$ sf skuid:page:pull --page Page1,Page2,Page3 --dir newpages'
  ];

  public static readonly flags = {
    // flag with a value (-n, --name=VALUE)
    module: Flags.string({ char: 'm', description: messages.getMessage('moduleFlagDescription') }),
    page: Flags.string({ char: 'p', description: messages.getMessage('pageNameFlagDescription') }),
    nomodule: Flags.boolean({ description: messages.getMessage('noModuleFlagDescription') }),
    dir: Flags.string({ char: 'd', description: messages.getMessage('dirFlagDescription') }),
    // 'target-org': Flags.requiredOrg(),
    // 'api-version': Flags.orgApiVersion({
    //   char: 'a',
    //   default: 'v57.0',
    // }),
  };

  // Our command requires an SFDX username
  protected static requiresUsername = true;

  public async run(): Promise<AnyJson> {
    const { flags } = await this.parse(Pull);
    const {
      json,
      module,
      nomodule,
      page
    } = flags;

    let dir = flags.dir as string;
    if (!dir) dir = 'skuidpages';

    const queryParams = {} as PullQueryParams;

    if (nomodule) queryParams.nomodule = true;
    if (typeof module === 'string') queryParams.module = module;
    if (typeof page === 'string') queryParams.page = page;

    // when you get a Connection, pass the api-version flag to it
    // that way, if the user specified an api version, the Connection is set
    const conn = flags['target-org'].getConnection(flags['api-version']);

    let resultJSON: string = await conn.apex.get(`/skuid/api/v1/pages?${param(queryParams)}`);

    // If json requested, just return the result,
    // but trim off leading _ from the page names,
    // which will happen for pages not in a module
    if (json) {
      const result:JsonResponse = JSON.parse(resultJSON);
      Object.keys(result).forEach(pageName => {
        const pageResult = result[pageName] || {};
        const xmlKey = pageResult.hasOwnProperty('body') ? 'body' : 'content';
        const currentXml = pageResult[xmlKey];
        pageResult[xmlKey] = this.beautifyXml(currentXml || "", pageName);
        if (pageName.startsWith('_')) {
          result[pageName.substring(1)] = pageResult;
          delete result[pageName];
        }
        const newName = pageName.replace(/[\/\\]/g, '');
        if (pageName !== newName) {
          result[newName] = result[pageName];
          delete result[pageName];
        }
      });
      return {
        pages: result
      } as AnyJson;
    }

    // Otherwise, write a .json and .xml file in the specified output directory for every retrieved file.
    if (typeof dir === 'string' && !existsSync(dir)) mkdirSync(dir);

    const skuidPages:JsonResponse = JSON.parse(resultJSON);
    // Clear out heap
    resultJSON = "";
    let numPages: number = 0;

    Object.entries(skuidPages).forEach(([ pageName, skuidPage]) => {
      numPages++;
      // Trim leading _ off of the name, which will happen for pages not in a module
      if (pageName.startsWith('_')) pageName = pageName.substring(1);
      pageName = pageName.replace(/[\/\\]/g, '');
      const pageBasePath: string = resolve(dir, pageName);
      const xml: string = skuidPage.body || skuidPage.content || "";
      writeFileSync(pageBasePath + '.xml', this.beautifyXml(xml, pageName), 'utf8');
      delete skuidPage.body;
      delete skuidPage.content;
      // Remove all null props
      for (const prop in skuidPage) {
        const propKey = prop as keyof SkuidPage;
        if (skuidPage[propKey] === null) delete skuidPage[propKey];
      }
      // Serialize using a stable sorting algorithm
      writeFileSync(pageBasePath + '.json', stringify(skuidPage), 'utf8');
      // Clear out memory from our response
      delete skuidPages[pageName];
    });

    this.log('Wrote ' + numPages + ' pages to ' + dir);

    return {};
  }

  private beautifyXml(xml: string, pageName: string): string {
    try {
      xml = formatXml(xml);
    } catch (err) {
      this.error(`Page ${pageName} has invalid XML.`);
    }
    return xml;
  }
}
