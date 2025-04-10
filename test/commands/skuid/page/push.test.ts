// import { expect, test } from '@salesforce/command/lib/test';
import { expect } from 'chai';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { SkuidPage, PagePost } from "../../../../src/types/types";
import { condenseXml } from "../../../../src/helpers/xml";
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Config } from '@oclif/core';
import Push from "../../../../src/commands/skuid/page/push";
const fixturesDir = resolve(__dirname, '../../../fixtures');
const v1PageMetadata = readFileSync(join(fixturesDir, 'foo_SomePageName.json'), 'utf8');
const v1PageXml = readFileSync(join(fixturesDir, 'foo_SomePageName.xml'), 'utf8');
const v2PageMetadata = readFileSync(join(fixturesDir, 'AnotherPageName.json'), 'utf8');
const v2PageXml = readFileSync(join(fixturesDir, 'AnotherPageName.xml'), 'utf8');
const v1PageMetadataWithXml = Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }) as SkuidPage;
const v2PageMetadataWithXml = Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }) as SkuidPage;
const expectPushPayloadToHavePages = (pushPayload:string, pages:SkuidPage[]) => {
    const payload:PagePost = JSON.parse(pushPayload) as PagePost;
    expect(payload).to.have.property("changes");
    expect(payload.changes.length).to.equal(pages.length);
    expect(payload.changes).to.have.deep.members(
        pages.map(p => Object.assign({}, p, { body: condenseXml(p.body) }))
    );
};

describe('skuid:page:push', () => {
    const $$ = new TestContext();
    const testOrg = new MockTestOrgData();
    const config = new Config({ root: resolve(__dirname, '../../../package.json') });

    beforeEach(async () => {
        await $$.stubAuths(testOrg);
        await config.load();
    });

    afterEach(async () => {
        $$.restore();
    });

    it('runs skuid:page:push from a source directory', async ctx => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [ v2PageMetadataWithXml, v1PageMetadataWithXml ]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            ['--dir', 'test/fixtures'],
            config
        );

        const result = await cmd.run();
        expect(result).to.contain('Found 2 matching pages within test/fixtures, pushing changes to org...');
        expect(result).to.contain('2 Pages successfully pushed.');
    });

    // it('should display result as json if --json specified', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [ v2PageMetadataWithXml, v1PageMetadataWithXml ]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures', '--json'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.deep.equal({
    //         status: 0,
    //         result: {
    //             pages: [ 'AnotherPageName', 'foo_SomePageName' ],
    //             success: true
    //         }
    //     });
    // });

    // it('only pushes pages matching a file glob', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [v1PageMetadataWithXml]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*SomePage*'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 1 matching pages within current directory, pushing changes to org...');
    //     expect(result).to.contain('1 Pages successfully pushed.');
    // });

    // it('should accept multiple file paths', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         [
    //             'skuid:page:push',
    //             '-u=test@org.com',
    //             'test/fixtures/AnotherPageName.json',
    //             'test/fixtures/AnotherPageName.xml',
    //             'test/fixtures/foo_SomePageName.json',
    //             'test/fixtures/foo_SomePageName.xml',
    //         ],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 2 matching pages within current directory, pushing changes to org...');
    //     expect(result).to.contain('2 Pages successfully pushed.');
    // });

    // it('should accept multiple file paths, but remove duplicates', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         [
    //             'skuid:page:push',
    //             '-u',
    //             'test@org.com',
    //             'test/fixtures/AnotherPageName.xml',
    //             'test/fixtures/AnotherPageName.xml',
    //             'test/fixtures/foo_SomePageName.xml',
    //             'test/fixtures/foo_SomePageName.xml',
    //         ],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 2 matching pages within current directory, pushing changes to org...');
    //     expect(result).to.contain('2 Pages successfully pushed.');
    // });

    // it('should accept multiple file paths containing globs', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [v1PageMetadataWithXml]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         [
    //             'skuid:page:push',
    //             '-u',
    //             'test@org.com',
    //             '-d',
    //             'test',
    //             'fixtures/boo*',
    //             '*foo*',
    //             'fixtures/foo_SomePageName.xml'
    //         ],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 1 matching pages within test, pushing changes to org...');
    //     expect(result).to.contain('1 Pages successfully pushed.');
    // });

    // it('should ignore non-Skuid metadata files', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
    //             return Promise.resolve(JSON.stringify({
    //                 success: true,
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         [
    //             'skuid:page:push',
    //             '-u',
    //             'test@org.com',
    //             '-d',
    //             'test',
    //             '**/*',
    //         ],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 2 matching pages within test, pushing changes to org...');
    //     expect(result).to.contain('2 Pages successfully pushed.');
    // });

    // it('should not make a request if no matching pages are found', async ctx => {
    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*BBBBBBBB*'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found no matching pages in the provided file paths.');
    // });

    // it('should return json result if no matching pages are found', async ctx => {
    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*BBBBBBBB*', '--json'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.deep.equal({
    //         status: 0,
    //         result: {
    //             pages: [],
    //             success: false
    //         }
    //     });
    // });

    // it('handles errors from server', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             return Promise.resolve(JSON.stringify({
    //                 success: false,
    //                 upsertErrors: [
    //                     'Invalid Name for Page'
    //                 ]
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     expect(result).to.contain('Found 2 matching pages within test/fixtures, pushing changes to org...');
    //     expect(result).to.contain('Invalid Name for Page');
    // });

    // it('handles errors from server and returns in json format if requested', async ctx => {
    //     $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
    //         const requestMap = ensureJsonMap(request);
    //         if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
    //             return Promise.resolve(JSON.stringify({
    //                 success: false,
    //                 upsertErrors: [
    //                     'Invalid Name for Page'
    //                 ]
    //             }));
    //         }
    //         return Promise.reject(new Error('Unexpected request'));
    //     };

    //     const cmd = new Push(
    //         ['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures', '--json'],
    //         config
    //     );

    //     const result = await cmd.run();
    //     // const jsonOutput = JSON.parse(ctx.stderr);
    //     // // Delete stack because it's too messy to test
    //     // delete jsonOutput.stack;
    //     expect(result).to.deep.equal({
    //         "status": 1,
    //         "name": "SkuidPagePushError",
    //         "message": "Invalid Name for Page",
    //         "exitCode": 1,
    //         "actions": [],
    //         "commandName": "Push",
    //         "warnings": []
    //     });
    // });
});
