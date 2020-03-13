import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson, JsonMap } from '@salesforce/ts-types';
import { getPageDefinitionsFromGlob } from '../../../helpers/readPageFiles';
import {
    PagePost,
    PagePostResult,
} from '../../../types/types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-push');

export default class Push extends SfdxCommand {

    public static description = messages.getMessage('commandDescription');

    public static examples = [
        '$ sfdx skuid:page:push --targetusername myOrg@example.com',
        '$ sfdx skuid:page:push skuidpages/*SalesApp',
    ];

    public static args = [{ name: 'file' }];

    protected static flagsConfig = {
        dir: flags.string({ char: 'd', description: messages.getMessage('dirFlagDescription') })
    };

    // Our command requires an SFDX username
    protected static requiresUsername = true;

    public async run(): Promise<AnyJson> {
        
        const { file } = this.args;
        const {
            json,
            dir,
        } = this.flags;

        const pageDefinitions = await getPageDefinitionsFromGlob(file || "**/*.json", dir) as any[];

        if (!pageDefinitions.length) {
            this.ux.log("Found no matching pages within target directory.");
            return {};
        }

        this.ux.log("Found " + pageDefinitions.length + " matching pages within " + (dir ? dir : "current directory") + ", pushing changes to org...");
        
        this.logger.debug(pageDefinitions.map(p => p.name));

        const pagePost = { changes: pageDefinitions } as PagePost;

        const conn = this.org.getConnection();
        let resultJSON: string = await conn.apex.post('/skuid/api/v1/pages', pagePost, {
            headers: {
                "Content-Type": "application/json",
            }
        });
        const result: JsonMap = JSON.parse(resultJSON);

        // If json requested, just return the raw result
        if (json) {
            return {
                success: result.success
            };
        }

        const pushResult = result as PagePostResult;

        if (!pushResult.success){
            this.ux.error("There were errors pushing Skuid Pages:");
            for (const err in pushResult.upsertErrors) {
                this.ux.error(err);
            }
        } else {
            this.ux.log(pageDefinitions.length + " Pages successfully pushed.");
        }

        return {};
    }
}
