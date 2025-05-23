/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// eslint-disable-next-line unicorn/prefer-node-protocol
import { resolve } from 'path';
import { Config } from '@oclif/core';
import { sync as rmSync } from 'rimraf';
import { expect } from 'chai';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import Pull from '../../../../src/commands/skuid/page/pull';
import { formatXml } from '../../../../src/helpers/xml';

// Explicitly define types for rimraf functions
type rimrafRmSync = (value: string) => void;
const typedRmSync: rimrafRmSync = rmSync as rimrafRmSync;

const v1PageObject = {
  'apiVersion': 'v1',
  'name': 'SomePageName',
  'module': 'foo',
  'uniqueId': 'foo_SomePageName',
  'composerSettings': null,
  'maxAutoSaves': 100,
  'body': '<skuidpage><models/></skuidpage>',
};

const v1PageObjectWithSlashModule = {
  'apiVersion': 'v1',
  'name': 'Some/Page\\Name',
  'module': 'foo/bar\\baz',
  'uniqueId': 'foo/bar\\baz_Some/Page\\Name',
  'composerSettings': null,
  'maxAutoSaves': '100',
  'body': '<skuidpage><models/></skuidpage>'
};

const v2PageObject = {
  'apiVersion': 'v2',
  'name': 'AnotherPageName',
  'module': null,
  'uniqueId': '_AnotherPageName',
  'composerSettings': { },
  'maxAutoSaves': 98,
  'body': '<skuid__page><models><model id="Accs"></model></models></skuid__page>',
};
const v1PageWithPrettyXML = Object.assign({}, v1PageObject, {
  body: formatXml(v1PageObject.body)
});
const v2PageWithPrettyXML = Object.assign({}, v2PageObject, {
  body: formatXml(v2PageObject.body)
});

const v1PageObjectWithSlashModulePrettyXML = Object.assign({}, v1PageObjectWithSlashModule, {
  body: formatXml(v1PageObjectWithSlashModule.body)
});

describe('skuid page pull', () => {

  const clean = (): void => {
    typedRmSync('foo');
    typedRmSync('skuidpages');
  };

  const $$ = new TestContext();
  const testData = new MockTestOrgData();
  const config = new Config({ root: resolve(__dirname, '../../../package.json') });

  beforeEach(async () => {
    await $$.stubAuths(testData);
    await config.load();
    clean();
  });

  afterEach(() => {
    $$.restore();
    clean();
  });

  // This allows us to test messages that are logged to the console
  const testLogMessages = (cmd: Pull, messages: string[]): void => {
      let i = 0;
      // eslint-disable-next-line no-param-reassign
      cmd.log = (result): void => {
          expect(result).to.contain(messages[i]);
          i++;
      };
  }

  it('runs skuid:page:pull with no page or module specified', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          'foo_SomePageName': v1PageObject,
          '_AnotherPageName': v2PageObject,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    };

    const cmd = new Pull(
      ['--target-org', testData.username],
      config
    );

    testLogMessages(cmd, [ 'Wrote 2 pages to skuidpages' ]);
    await cmd.run();
  });

  it('only requests pages with no module, and respects dir ', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?nomodule=true/)) {
        return Promise.resolve(JSON.stringify({
          '_AnotherPageName': v2PageObject,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    };

    const cmd = new Pull(
      ['--target-org', testData.username, '--nomodule', '--dir', 'foo'],
      config
    );

    testLogMessages(cmd, [ 'Wrote 1 pages to foo' ]);
    await cmd.run();
  });

  it('only requests pages in specified module', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo/)) {
        return Promise.resolve(JSON.stringify({
          'foo_SomePageName': v1PageObject,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    }

    const cmd = new Pull(
      ['--target-org', testData.username, '--module', 'foo'],
      config
    );

    testLogMessages(cmd, [ 'Wrote 1 pages to skuidpages' ]);
    await cmd.run();
  });
  
  it('removes unsafe directory characters from at-rest file names', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          'foo/bar\\baz_Some/Page\\Name': v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    }

    const cmd = new Pull(
      ['--target-org', testData.username, '--module', 'foo/bar\\baz'],
      config
    );

    testLogMessages(cmd, [ 'Wrote 1 pages to skuidpages' ]);
    await cmd.run();
  });

  it('only requests specific pages', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?page=SomePageName%2CAnotherPageName/)) {
        return Promise.resolve(JSON.stringify({
          'foo_SomePageName': v1PageObject,
          '_AnotherPageName': v2PageObject,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    }

    const cmd = new Pull(
      ['--target-org', testData.username, '--page', 'SomePageName,AnotherPageName'],
      config
    );

    testLogMessages(cmd, [ 'Wrote 2 pages to skuidpages' ]);
    await cmd.run();
  });

  it('returns results as json', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          'foo_SomePageName': v1PageObject,
          '_AnotherPageName': v2PageObject,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    }

    const cmd = new Pull(
      ['--target-org', testData.username, '--json'],
      config
    );

    const jsonOutput = await cmd.run();
    expect(jsonOutput).to.deep.equal({
      pages: {
        'foo_SomePageName': v1PageWithPrettyXML,
        'AnotherPageName': v2PageWithPrettyXML,
      }
    });
  });

  it('removes unsafe directory characters from at-rest file names in json output', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          'foo/bar\\baz_Some/Page\\Name': v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    }

    const cmd = new Pull(
      ['--target-org', testData.username, '--json', '--module', 'foo/bar\\baz'],
      config
    );

    const jsonOutput = await cmd.run();
    expect(jsonOutput).to.deep.equal({
      pages: {
        'foobarbaz_SomePageName': v1PageObjectWithSlashModulePrettyXML,
      }
    });
  });
});
