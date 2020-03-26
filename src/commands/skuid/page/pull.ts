import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from '../../../helpers/jsonStringify';
import { param } from '../../../helpers/param';

import { formatXml } from '../../../helpers/formatXml';
import {
  PullQueryParams,
  SkuidPage
} from '../../../types/types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-pull');

export default class Pull extends SfdxCommand {

  public static description = messages.getMessage('commandDescription');

  public static examples = [
  '$ sfdx skuid:page:pull --targetusername myOrg@example.com --module CommunityPages',
  '$ sfdx skuid:page:pull --nomodule',
  '$ sfdx skuid:page:pull --page Page1,Page2,Page3 --dir newpages'
  ];

  public static args = [];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    module: flags.string({ char: 'm', description: messages.getMessage('moduleFlagDescription') }),
    page: flags.string({ char: 'p', description: messages.getMessage('pageNameFlagDescription') }),
    nomodule: flags.boolean({ description: messages.getMessage('noModuleFlagDescription') }),
    dir: flags.string({ char: 'd', description: messages.getMessage('dirFlagDescription') })
  };

  // Our command requires an SFDX username
  protected static requiresUsername = true;

  public async run(): Promise<AnyJson> {
    const {
      json,
      module,
      nomodule,
      page
    } = this.flags;

    let { dir } = this.flags;
    if (!dir) dir = 'skuidpages';

    const queryParams = {} as PullQueryParams;

    if (nomodule) queryParams.nomodule = true;
    if (module) queryParams.module = module;
    if (page) queryParams.page = page;

    const conn = this.org.getConnection();
    let resultJSON: string = await conn.apex.get(`/skuid/api/v1/pages?${param(queryParams)}`);
    // If json requested, just return the result,
    // but trim off leading _ from the page names,
    // which will happen for pages not in a module
    if (json) {
      const result: JsonMap = JSON.parse(resultJSON);
      Object.keys(result).forEach(pageName => {
        const pageResult = result[pageName];
        const xmlKey = pageResult.hasOwnProperty('body') ? 'body' : 'content';
        pageResult[xmlKey] = this.beautifyXml(pageResult[xmlKey], pageName);
        if (pageName.startsWith('_')) {
          result[pageName.substring(1)] = pageResult;
          delete result[pageName];
        }
      });
      return {
        pages: result
      };
    }

    // Otherwise, write a .json and .xml file in the specified output directory for every retrieved file.
    if (!existsSync(dir)) mkdirSync(dir);

    const skuidPages: Map<string, SkuidPage> = JSON.parse(resultJSON);
    // Clear out heap
    resultJSON = null;
    let numPages: number = 0;

    Object.entries(skuidPages).forEach(([ pageName, skuidPage]) => {
      numPages++;
      if (pageName.startsWith('_')) pageName = pageName.substring(1);
      const pageBasePath: string = resolve(dir, pageName);
      // Trim leading _ off of the name, which will happen for pages not in a module
      const xml: string = skuidPage.body || skuidPage.content;
      writeFileSync(pageBasePath + '.xml', this.beautifyXml(xml, pageName), 'utf8');
      delete skuidPage.body;
      delete skuidPage.content;
      // Remove all null props
      for (const prop in skuidPage) {
        if (skuidPage[prop] === null ) delete skuidPage[prop];
      }
      // Serialize using a stable sorting algorithm
      writeFileSync(pageBasePath + '.json', stringify(skuidPage), 'utf8');
      // Clear out memory from our response
      delete skuidPages[pageName];
    });

    this.ux.log('Wrote ' + numPages + ' pages to ' + dir);

    return {};
  }

  private beautifyXml(xml: string, pageName: string): string {
    try {
      xml = formatXml(xml);
    } catch (err) {
      this.ux.error(`Page ${pageName} has invalid XML.`);
    }
    return xml;
  }
}
