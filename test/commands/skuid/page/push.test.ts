import { expect, test } from '@salesforce/command/lib/test';
import { ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
const fixturesDir = resolve(__dirname, '../../../fixtures');
const v1PageMetadata = readFileSync(join(fixturesDir, 'foo_SomePageName.json'), 'utf8');
const v1PageXml = readFileSync(join(fixturesDir, 'foo_SomePageName.xml'), 'utf8');
const v2PageMetadata = readFileSync(join(fixturesDir, 'AnotherPageName.json'), 'utf8');
const v2PageXml = readFileSync(join(fixturesDir, 'AnotherPageName.xml'), 'utf8');

describe('skuid:page:push', () => {
    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }),
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures'])
        .it('runs skuid:page:push from a source directory', ctx => {
            expect(ctx.stdout).to.contain('Found 2 matching pages within test/fixtures, pushing changes to org...');
            expect(ctx.stdout).to.contain('2 Pages successfully pushed.');
        });
    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }),
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures', '--json'])
        .it('should display result as json if --json specified', ctx => {
            const jsonOutput = JSON.parse(ctx.stdout);
            expect(jsonOutput).to.deep.equal({
                status: 0,
                result: {
                    pages: [ 'AnotherPageName', 'foo_SomePageName' ],
                    success: true
                }
            });
        });
    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*SomePage*'])
        .it('only pushes pages matching a file glob', ctx => {
            expect(ctx.stdout).to.contain('Found 1 matching pages within current directory, pushing changes to org...');
            expect(ctx.stdout).to.contain('1 Pages successfully pushed.');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }),
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command([
            'skuid:page:push',
            '-u=test@org.com',
            'test/fixtures/AnotherPageName.json',
            'test/fixtures/AnotherPageName.xml',
            'test/fixtures/foo_SomePageName.json',
            'test/fixtures/foo_SomePageName.xml',
        ])
        .it('should accept multiple file paths', ctx => {
            expect(ctx.stdout).to.contain('Found 2 matching pages within current directory, pushing changes to org...');
            expect(ctx.stdout).to.contain('2 Pages successfully pushed.');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v2PageMetadata), { body: v2PageXml }),
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command([
            'skuid:page:push',
            '-u',
            'test@org.com',
            'test/fixtures/AnotherPageName.xml',
            'test/fixtures/AnotherPageName.xml',
            'test/fixtures/foo_SomePageName.xml',
            'test/fixtures/foo_SomePageName.xml',
        ])
        .it('should accept multiple file paths, but remove duplicates', ctx => {
            expect(ctx.stdout).to.contain('Found 2 matching pages within current directory, pushing changes to org...');
            expect(ctx.stdout).to.contain('2 Pages successfully pushed.');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
            const requestMap = ensureJsonMap(request);
            if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
                expect(requestMap.body).to.deep.equal(JSON.stringify({
                    changes: [
                        Object.assign({}, JSON.parse(v1PageMetadata), { body: v1PageXml }),
                    ]
                }));
                return Promise.resolve(JSON.stringify({
                    success: true,
                }));
            }
            return Promise.reject(new Error('Unexpected request'));
        })
        .stdout()
        .command([
            'skuid:page:push',
            '-u',
            'test@org.com',
            '-d',
            'test',
            'fixtures/boo*',
            '*foo*',
            'fixtures/foo_SomePageName.xml'
        ])
        .it('should accept multiple file paths containing globs', ctx => {
            expect(ctx.stdout).to.contain('Found 1 matching pages within test, pushing changes to org...');
            expect(ctx.stdout).to.contain('1 Pages successfully pushed.');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .stdout()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*BBBBBBBB*'])
        .it('should not make a request if no matching pages are found', ctx => {
            expect(ctx.stdout).to.contain('Found no matching pages in the provided file paths.');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .stdout()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', 'test/fixtures/*BBBBBBBB*', '--json'])
        .it('should return json result if no matching pages are found', ctx => {
            const jsonOutput = JSON.parse(ctx.stdout);
            expect(jsonOutput).to.deep.equal({
                status: 0,
                result: {
                    pages: [],
                    success: false
                }
            });
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
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
        })
        .stdout()
        .stderr()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures'])
        .it('handles errors from server', ctx => {
            expect(ctx.stdout).to.contain('Found 2 matching pages within test/fixtures, pushing changes to org...');
            expect(ctx.stderr).to.contain('Invalid Name for Page');
        });

    test
        .withOrg({ username: 'test@org.com' }, true)
        .withConnectionRequest(request => {
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
        })
        .stdout()
        .stderr()
        .command(['skuid:page:push', '--targetusername', 'test@org.com', '--dir', 'test/fixtures', '--json'])
        .it('handles errors from server and returns in json format if requested', ctx => {
            const jsonOutput = JSON.parse(ctx.stderr);
            // Delete stack because it's too messy to test
            delete jsonOutput.stack;
            expect(jsonOutput).to.deep.equal({
                "status": 1,
                "name": "SkuidPagePushError",
                "message": "Invalid Name for Page",
                "exitCode": 1,
                "actions": [],
                "commandName": "Push",
                "warnings": []
            });
        });

});
