/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable unicorn/prefer-node-protocol */
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { expect } from 'chai';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { Config } from '@oclif/core';
import { SkuidPage, PagePost } from '../../../../src/types/types';
import { condenseXml } from '../../../../src/helpers/xml';
import Push from '../../../../src/commands/skuid/page/push';
const fixturesDir = resolve(__dirname, '../../../fixtures');
const v1PageMetadata = readFileSync(join(fixturesDir, 'foo_SomePageName.json'), 'utf8');
const v1PageXml = readFileSync(join(fixturesDir, 'foo_SomePageName.xml'), 'utf8');
const v2PageMetadata = readFileSync(join(fixturesDir, 'AnotherPageName.json'), 'utf8');
const v2PageXml = readFileSync(join(fixturesDir, 'AnotherPageName.xml'), 'utf8');
const v1PageMetadataWithXml = Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }) as SkuidPage;
const v2PageMetadataWithXml = Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }) as SkuidPage;
const expectPushPayloadToHavePages = (pushPayload: string, pages: SkuidPage[]): void => {
    const payload: PagePost = JSON.parse(pushPayload) as PagePost;
    expect(payload).to.have.property('changes');
    expect(payload.changes.length).to.equal(pages.length);
    expect(payload.changes).to.have.deep.members(
        pages.map(p => Object.assign({}, p, { body: p.body ? condenseXml(p.body) : undefined }))
    );
};

describe('skuid:page:push', () => {
    const $$ = new TestContext();
    const testData = new MockTestOrgData();
    const config = new Config({ root: resolve(__dirname, '../../../package.json') });

    beforeEach(async () => {
        await $$.stubAuths(testData);
        await config.load();
    });

    afterEach(() => {
        $$.restore();
    });

    // This allows us to test messages that are logged to the console
    const testLogMessages = (cmd: Push, messages: string[]): void => {
        let i = 0;
        // eslint-disable-next-line no-param-reassign
        cmd.log = (result): void => {
            expect(result).to.contain(messages[i]);
            i++;
        };
    }

    it('runs skuid:page:push from a source directory', async () => {
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
            ['--target-org', testData.username, '--dir', 'test/fixtures'],
            config
        );

        testLogMessages(cmd, [
            'Found 2 matching pages within test/fixtures, pushing changes to org...',
            '2 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should display result as json if --json specified', async () => {
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
            ['--target-org', testData.username, '--dir', 'test/fixtures', '--json', '**/*.json'],
            config
        );

        const result = await cmd.run();
        type PushResult = { pages: string[]; success: boolean };
        const typedResult = result as PushResult;
        expect(typedResult.pages).to.contain('AnotherPageName');
        expect(typedResult.pages).to.contain('foo_SomePageName');
        expect(typedResult.success).to.equal(true);
    });

    it('only pushes pages matching a file glob', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [v1PageMetadataWithXml]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            ['--target-org', testData.username, 'test@org.com', 'test/fixtures/*SomePage*'],
            config
        );

        testLogMessages(cmd, [
            'Found 1 matching pages within current directory, pushing changes to org...',
            '1 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should accept multiple file paths', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [
                '--target-org',
                testData.username,
                'test/fixtures/AnotherPageName.json',
                'test/fixtures/AnotherPageName.xml',
                'test/fixtures/foo_SomePageName.json',
                'test/fixtures/foo_SomePageName.xml',
            ],
            config
        );

        testLogMessages(cmd, [
            'Found 2 matching pages within current directory, pushing changes to org...',
            '2 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should accept multiple file paths, but remove duplicates', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [
                '--target-org',
                testData.username,
                'test/fixtures/AnotherPageName.xml',
                'test/fixtures/AnotherPageName.xml',
                'test/fixtures/foo_SomePageName.xml',
                'test/fixtures/foo_SomePageName.xml',
            ],
            config
        );

        testLogMessages(cmd, [
            'Found 2 matching pages within current directory, pushing changes to org...',
            '2 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should accept multiple file paths containing globs', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [v1PageMetadataWithXml]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [
                '--target-org',
                testData.username,
                '-d',
                'test',
                'fixtures/boo*',
                '*foo*',
                'fixtures/foo_SomePageName.xml'
            ],
            config
        );

        testLogMessages(cmd, [
            'Found 1 matching pages within test, pushing changes to org...',
            '1 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should ignore non-Skuid metadata files', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml]);
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [
                '--target-org',
                testData.username,
                '-d',
                'test',
                '**/*',
            ],
            config
        );

        testLogMessages(cmd, [
            'Found 2 matching pages within test, pushing changes to org...',
            '2 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should not make a request if no matching pages are found', async () => {
        const cmd = new Push(
            ['--target-org', testData.username, 'test/fixtures/*BBBBBBBB*'],
            config
        );

        testLogMessages(cmd, [
            'Found no matching pages in the provided file paths.'
        ]);

        await cmd.run();
    });

    it('should return json result if no matching pages are found', async () => {
        const cmd = new Push(
            ['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*BBBBBBBB*', '--json'],
            config
        );

        const result = await cmd.run();
        expect(result).to.deep.equal({
            pages: [],
            success: false
        });
    });

    it('handles errors from server', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                return Promise.resolve(JSON.stringify({
                    success: false,
                    upsertErrors: [
                        'Invalid Name for Page'
                    ]
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [ '--target-org', testData.username, '--dir', 'test/fixtures'],
            config
        );

        testLogMessages(cmd, [
            'Found 2 matching pages within test/fixtures, pushing changes to org...',
            'AnotherPageName',
            'foo_SomePageName'
        ]);

        try {
            await cmd.run();
        } catch (e) {
            expect(e).to.be.instanceOf(Error);
            if (e instanceof Error) {
                expect(e.message).to.contain('Invalid Name for Page');
            }
        }
    });

    it('handles errors from server and returns in json format if requested', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                return Promise.resolve(JSON.stringify({
                    success: false,
                    upsertErrors: [
                        'Invalid Name for Page'
                    ]
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            [ '--target-org', testData.username, '--dir', 'test/fixtures', '--json'],
            config
        );

        try {
            await cmd.run();
        } catch (e) {
            const jsonString = JSON.stringify(e, Object.getOwnPropertyNames(e));
            const jsonOutput: Error = JSON.parse(jsonString) as Error;

            // Delete stack because it's too messy to test
            delete jsonOutput.stack;

            expect(e).to.be.instanceOf(Error);
            expect(jsonOutput).to.deep.equal({
                'name': 'SkuidPagePushError',
                'message': 'Invalid Name for Page',
                'exitCode': 1,
                'actions': [],
            });
        }
    });
});
