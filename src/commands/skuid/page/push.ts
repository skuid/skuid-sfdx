import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { getPageDefinitionsFromFileGlobs } from '../../../helpers/readPageFiles';
import { condenseXml } from '../../../helpers/xml';
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
        '$ sfdx skuid:page:push -u=myOrg@example.com *SalesApp*',
        '$ sfdx skuid:page:push skuidpages/SalesApp*',
        '$ sfdx skuid:page:push -d=salespages SalesApp*',
        '$ sfdx skuid:page:push pages/SalesAppHome.xml pages/CommissionDetails.xml',
        '$ sfdx skuid:page:push **/*.xml'
    ];

    // Allow a variable number of arguments to allow shells to auto-expand globs,
    // e.g. zsh may expand the single arg "foo/sample*" into separate arguments
    /// "foo/sample1.xml foo/sample1.json foo/sample2.json foo/sample2.xml"
    public static strict = false;
    public static args = [{ name: 'file' }];

    protected static flagsConfig = {
        dir: flags.string({ char: 'd', description: messages.getMessage('dirFlagDescription') })
    };

    // Our command requires an SFDX username
    protected static requiresUsername = true;

    public async run(): Promise<AnyJson> {

        const {
            json,
            dir
        } = this.flags;
        const logLevel = this.logger.getLevel();
        const filePaths = [];

        const shortFlagChars = new Set();
        for (const flagConfig of Object.values(Push.flagsConfig)) {
            const config = flagConfig as unknown as FlagsConfig;
            shortFlagChars.add(config.char);
        }

        for (let i = 0; i < this.argv.length; i++) {
            const arg = this.argv[i];
            if (!arg || !arg.length) continue;
            let equalsIndex = arg.indexOf('=');
            if (equalsIndex === -1) equalsIndex = arg.length;
            const isArg =
                // Long-form args
                (arg.startsWith('--') && this.flags[arg.substring(2, equalsIndex)]) ||
                // Short-form args
                (
                    arg.startsWith('-') &&
                    (
                        shortFlagChars.has(arg.substring(1, equalsIndex)) ||
                        (arg.substring(1, equalsIndex) === 'u')
                    )
                );
            if (isArg) {
                // If this is a vararg, then the value is contained in the arg,
                // and we do NOT need to do a look-ahead to the subsequent arg to get the value.
                // Otherwise, we need to skip the subsequent argument for purposes of our parsing
                // because it is not a file path, it's the value for this arg.
                const isVarArg = arg === '--json' || arg.includes('=');
                if (!isVarArg) {
                    i = i + 1;
                }
            } else {
                filePaths.push(arg);
            }
        }

        if (!filePaths.length) filePaths.push('**/*.json');

        const pageDefinitions = await getPageDefinitionsFromFileGlobs(filePaths, dir) as SkuidPage[];

        if (!pageDefinitions.length) {
            if (json) {
                return {
                    pages: [],
                    success: false
                };
            } else {
                this.ux.log('Found no matching pages in the provided file paths.');
                return {};
            }
        }

        let loggedPageNames = false;
        const logPageNames = () => {
            if (!loggedPageNames) {
                loggedPageNames = true;
                pageDefinitions.forEach(pageDef => this.ux.log(` - ${getUniqueId(pageDef)}`));
            }
        };

        if (!json) {
            this.ux.log('Found ' + pageDefinitions.length + ' matching pages within ' + (dir ? dir : 'current directory') + ', pushing changes to org...');
             // if at "info" log level or below, display the names of the pages
            if (logLevel <= 30) logPageNames();
        }

        // Prior to sending the pages over the wire, condense the XML.
        // This prevents us from having to waste Apex processing time as well as network bandwidth.
        pageDefinitions.forEach(pageDefinition => {
            pageDefinition.body = condenseXml(pageDefinition.body);
        });

        const pagePost = { changes: pageDefinitions } as PagePost;

        const conn = this.org.getConnection();
        const resultJSON: string = await conn.apex.post('/skuid/api/v1/pages', pagePost, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const result: PagePostResult = JSON.parse(resultJSON);

        if (!result.success) {
            // If we haven't already, log the page names that were pushed,
            // to help the user with debugging the cause of any issues
            logPageNames();
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
