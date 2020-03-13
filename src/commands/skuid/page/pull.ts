import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { param } from '../../../helpers/param';
import { stringify } from '../../../helpers/stringify';
import {
  PullQueryParams,
  PullResponse
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
  '$ sfdx skuid:page:pull --page Page1,Page2,Page3 --outputdir newpages'
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    module: flags.string({ char: 'm', description: messages.getMessage('moduleFlagDescription') }),
    page: flags.string({ char: 'p', description: messages.getMessage('pageNameFlagDescription') }),
    nomodule: flags.boolean({ description: messages.getMessage('noModuleFlagDescription') }),
    outputdir: flags.string({ char: 'd', description: messages.getMessage('outputDirFlagDescription') })
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

    let { outputdir } = this.flags;
    if (!outputdir) outputdir = 'skuidpages';

    const queryParams = {} as PullQueryParams;

    if (nomodule) queryParams.nomodule = true;
    if (module) queryParams.module = module;
    if (page) queryParams.page = page;

    const conn = this.org.getConnection();
    let resultJSON: string = await conn.apex.get(`/skuid/api/v1/pages?${param(queryParams)}`);
    // If json requested, just return the raw result
    if (json) {
      const result: JsonMap = JSON.parse(resultJSON);
      return {
        pages: result
      };
    }

    // Otherwise, write a .json and .xml file in the specified output directory for every retrieved file.
    if (!existsSync(outputdir)) mkdirSync(outputdir);

    const pullResponses: Map<string, PullResponse> = JSON.parse(resultJSON);
    // Clear out heap
    resultJSON = null;
    let numPages: number = 0;

    Object.entries(pullResponses).forEach(([ pageName, pullResponse]) => {
      numPages++;
      const pageBasePath: string = resolve(outputdir, pageName);
      const xml: string = pullResponse.body || pullResponse.content;
      writeFileSync(pageBasePath + '.xml', xml, 'utf8');
      delete pullResponse.body;
      delete pullResponse.content;
      // Remove all null props
      for (const prop in pullResponse) {
        if (pullResponse[prop] === null ) delete pullResponse[prop];
      }
      // Serialize using a stable sorting algorithm
      writeFileSync(pageBasePath + '.json', stringify(pullResponse), 'utf8');
      // Clear out memory from our response
      delete pullResponses[pageName];
    });

    this.ux.log('Wrote ' + numPages + ' pages to ' + outputdir);

    return {};
  }
}
