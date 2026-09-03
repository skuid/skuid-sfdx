/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { expect } from 'chai';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { Config } from '@oclif/core';
import { SkuidPage, PagePost, PagePostResult } from '../../../../src/types/types.js';
import { condenseXml } from '../../../../src/helpers/xml.js';
import Push from '../../../../src/commands/skuid/page/push.js';
const fixturesDir = resolve(import.meta.dirname, '../../../fixtures');
const v1PageMetadata = readFileSync(join(fixturesDir, 'foo_SomePageName.json'), 'utf8');
const v1PageXml = readFileSync(join(fixturesDir, 'foo_SomePageName.xml'), 'utf8');
const v2PageMetadata = readFileSync(join(fixturesDir, 'AnotherPageName.json'), 'utf8');
const v2PageXml = readFileSync(join(fixturesDir, 'AnotherPageName.xml'), 'utf8');
// A v3 page: a v2/ink2 page authored in Page Designer, rooted at <NtxPage>
const v3PageMetadata = readFileSync(join(fixturesDir, 'V3PageName.json'), 'utf8');
const v3PageXml = readFileSync(join(fixturesDir, 'V3PageName.xml'), 'utf8');
const v1PageMetadataWithXml = Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }) as SkuidPage;
const v2PageMetadataWithXml = Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }) as SkuidPage;
const v3PageMetadataWithXml = Object.assign({}, JSON.parse(v3PageMetadata), { body: v3PageXml }) as SkuidPage;
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
    const config = new Config({ root: resolve(import.meta.dirname, '../../../package.json') });

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
        cmd.log = (result): void => {
            expect(result).to.contain(messages[i]);
            i++;
        };
    }

    // This allows us to capture warnings emitted by the command
    const testWarnings = (cmd: Push): string[] => {
        const warnings: string[] = [];
        cmd.warn = (input): string => {
            const message = typeof input === 'string' ? input : input.message;
            warnings.push(message);
            return message;
        };
        return warnings;
    }

    it('runs skuid:page:push from a source directory', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [ v2PageMetadataWithXml, v1PageMetadataWithXml, v3PageMetadataWithXml ]);
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
            'Found 3 matching pages within test/fixtures, pushing changes to org...',
            '3 Pages successfully pushed.'
        ]);

        await cmd.run();
    });

    it('should display result as json if --json specified', async () => {
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expectPushPayloadToHavePages(requestMap.body as string, [ v2PageMetadataWithXml, v1PageMetadataWithXml, v3PageMetadataWithXml ]);
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
        expect(typedResult.pages).to.contain('V3PageName');
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
                expectPushPayloadToHavePages(requestMap.body as string, [v2PageMetadataWithXml, v1PageMetadataWithXml, v3PageMetadataWithXml]);
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
            'Found 3 matching pages within test, pushing changes to org...',
            '3 Pages successfully pushed.'
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

    it('pushes a v3 page, preserving its NtxPage body and formatVersion', async () => {
        let capturedBody = '';
        $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                capturedBody = requestMap.body as string;
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        };

        const cmd = new Push(
            ['--target-org', testData.username, 'test/fixtures/V3PageName.*'],
            config
        );

        testLogMessages(cmd, [
            'Found 1 matching pages within current directory, pushing changes to org...',
            '1 Pages successfully pushed.'
        ]);

        await cmd.run();

        const payload: PagePost = JSON.parse(capturedBody) as PagePost;
        expect(payload.changes.length).to.equal(1);
        const pushedPage = payload.changes[0];
        expect(pushedPage.uniqueId).to.equal('_V3PageName');
        expect(pushedPage.formatVersion).to.equal('ink2');
        expect(pushedPage.body).to.equal(condenseXml(v3PageXml));
        expect(pushedPage.body).to.contain('<NtxPage>');
    });

    it('warns about, and excludes, a page whose XML root is not recognized', async () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'skuid-sfdx-push-'));
        // A valid page definition, but with an XML root this plugin does not know about.
        writeFileSync(join(tempDir, 'MysteryPage.json'), JSON.stringify({
            apiVersion: 'v2',
            name: 'MysteryPage',
            uniqueId: '_MysteryPage'
        }), 'utf8');
        writeFileSync(join(tempDir, 'MysteryPage.xml'), '<SomeFuturePage><components/></SomeFuturePage>', 'utf8');

        try {
            const cmd = new Push(
                ['--target-org', testData.username, '--dir', tempDir, '--json', '**/*.json'],
                config
            );
            const warnings = testWarnings(cmd);

            const result = await cmd.run() as PagePostResult;

            // The page must not be pushed silently -- it is both reported and excluded.
            expect(warnings.length).to.equal(1);
            expect(warnings[0]).to.contain('Skipping MysteryPage.json');
            expect(warnings[0]).to.contain('<NtxPage>');
            expect(result.pages).to.deep.equal([]);
            expect(result.success).to.equal(false);
            expect(result.skippedFiles?.length).to.equal(1);
            // "contain" rather than "equal": the reported path comes back from glob relative
            // to the source directory, and we do not want a path separator difference on
            // Windows to fail an assertion that is really about which file got reported.
            expect(result.skippedFiles?.[0].filePath).to.contain('MysteryPage.json');
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
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

        // Page names are logged in whatever order their definitions finished loading,
        // so collect the output and assert against it without depending on that order.
        const logged: string[] = [];
        cmd.log = (message?: string): void => {
            logged.push(message ?? '');
        };

        let caught: unknown;
        try {
            await cmd.run();
        } catch (e) {
            caught = e;
        }

        expect(caught).to.be.instanceOf(Error);
        expect((caught as Error).message).to.contain('Invalid Name for Page');

        // On failure the pushed page names are logged, to help debug the cause
        expect(logged[0]).to.contain('Found 3 matching pages within test/fixtures, pushing changes to org...');
        const pageNameOutput = logged.slice(1).join('\n');
        expect(pageNameOutput).to.contain('AnotherPageName');
        expect(pageNameOutput).to.contain('foo_SomePageName');
        expect(pageNameOutput).to.contain('V3PageName');
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

        let caught: unknown;
        try {
            await cmd.run();
        } catch (e) {
            caught = e;
        }

        // Assert the fields this command actually sets, rather than deep-equalling
        // the error's whole own-property set. That set is framework-owned and it
        // changed between @salesforce/core 3 and 9 -- an empty `actions` is no
        // longer serialized -- which is not something this plugin promises.
        // Capturing the error first also means the test fails, rather than
        // silently passing, if run() stops throwing.
        expect(caught).to.be.instanceOf(Error);
        const error = caught as Error & { exitCode?: number };
        expect(error.name).to.equal('SkuidPagePushError');
        expect(error.message).to.contain('Invalid Name for Page');
        expect(error.exitCode).to.equal(1);
    });
});
