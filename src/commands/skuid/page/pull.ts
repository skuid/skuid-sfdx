import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import {
  PullResponse,
  PullQueryParams,
} from "../../../types/types";
import { param } from "../../../helpers/param";
import { stringify } from "../../../helpers/stringify";
const fs = require("fs");
const path = require("path");

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-pull');

export default class Pull extends SfdxCommand {

  public static description = messages.getMessage("commandDescription");

  public static examples = [
  `$ sfdx skuid:page:pull --targetusername myOrg@example.com --module CommunityPages`,
  `$ sfdx skuid:page:pull --nomodule`,
  `$ sfdx skuid:page:pull --page Page1,Page2,Page3 --outputdir newpages`,
  ];

  public static args = [{name: 'file'}];

  protected static flagsConfig = {
    // flag with a value (-n, --name=VALUE)
    module: flags.string({ char: 'm', description: messages.getMessage('moduleFlagDescription') }),
    page: flags.string({ char: 'p', description: messages.getMessage('pageNameFlagDescription') }),
    nomodule: flags.boolean({ description: messages.getMessage('noModuleFlagDescription') }),
    outputdir: flags.string({ char: 'd', description: messages.getMessage('outputDirFlagDescription') }),
  };

  // Our command requires an SFDX username
  protected static requiresUsername = true;

  public async run(): Promise<AnyJson> {
    let {
      json,
      outputdir,
      nomodule,
      module,
      page,
    } = this.flags;

    if (!outputdir) outputdir = "skuidpages"

    const queryParams = {} as PullQueryParams;

    if (nomodule) queryParams.nomodule = true;
    if (module) queryParams.module = module;
    if (page) queryParams.page = page;

    const conn = this.org.getConnection();
    let resultJSON:string = await conn.apex.get(`/skuid/api/v1/pages?${param(queryParams)}`);
    // If json requested, just return the raw result
    if (json) {
      const result:JsonMap = JSON.parse(resultJSON);
      return {
        pages: result,
      };
    }

    // Otherwise, write a .json and .xml file in the specified output directory for every retrieved file.
    if (!fs.existsSync(outputdir)) fs.mkdirSync(outputdir);

    const result: Map<string, PullResponse> = JSON.parse(resultJSON);
    // Clear out heap
    resultJSON = null;
    let numPages:number = 0;

    for (const pageName in result) {
      numPages++;
      const pageBasePath: string = path.resolve(outputdir, pageName);
      const pullResponse: PullResponse = result[pageName];
      const xml: string = pullResponse.body || pullResponse.content;
      fs.writeFileSync(pageBasePath + ".xml", xml, "utf8");
      delete pullResponse.body;
      delete pullResponse.content;
      // Remove all null props
      for (let prop in pullResponse) {
        if (pullResponse[prop] === null ) delete pullResponse[prop];
      }
      // Serialize using a stable sorting algorithm
      fs.writeFileSync(pageBasePath + ".json", stringify(pullResponse), "utf8");
      // Clear out memory from our response
      delete result[pageName];
    }

    this.ux.log("Wrote " + numPages + " pages to " + outputdir);

    return {};
  }
}
