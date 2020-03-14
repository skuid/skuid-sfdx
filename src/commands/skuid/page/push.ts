import { flags, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { getPageDefinitionsFromGlob } from '../../../helpers/readPageFiles';
import {
    PagePost,
    PagePostResult,
    SkuidPage
} from '../../../types/types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('skuid-sfdx', 'skuid-page-push');
const getUniqueId = (page: SkuidPage) => page.uniqueId.startsWith('_') ? page.uniqueId.substring(1) : page.uniqueId;

export default class Push extends SfdxCommand {

    public static description = messages.getMessage('commandDescription');

    public static examples = [
        '$ sfdx skuid:page:push --targetusername myOrg@example.com',
        '$ sfdx skuid:page:push skuidpages/*SalesApp'
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
            dir
        } = this.flags;

        const pageDefinitions = await getPageDefinitionsFromGlob(file || '**/*.json', dir) as SkuidPage[];

        if (!pageDefinitions.length) {
            if (json) {
                return {
                    pages: [],
                    success: false
                };
            } else {
                this.ux.log('Found no matching pages within target directory.');
                return {};
            }
        }

        if (!json) {
            this.ux.log('Found ' + pageDefinitions.length + ' matching pages within ' + (dir ? dir : 'current directory') + ', pushing changes to org...');
            this.logger.debug(pageDefinitions.map(getUniqueId));
        }

        const pagePost = { changes: pageDefinitions } as PagePost;

        const conn = this.org.getConnection();
        const resultJSON: string = await conn.apex.post('/skuid/api/v1/pages', pagePost, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result: PagePostResult = JSON.parse(resultJSON);

        if (!result.success) {
            throw new SfdxError(result.upsertErrors.join(','), 'SkuidPagePushError', [], 1);
        }

        if (json) {
            result.pages = pageDefinitions.map(getUniqueId);
            return result;
        } else {
            this.ux.log(pageDefinitions.length + ' Pages successfully pushed.');
        }

        return {};
    }
}
