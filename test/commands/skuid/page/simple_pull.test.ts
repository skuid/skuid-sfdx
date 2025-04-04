import { Config } from '@oclif/core';
import { resolve } from 'path';
import { sync as rmSync } from 'rimraf';
import { expect } from 'chai';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import Pull from "../../../../src/commands/skuid/page/pull";

const v1PageObject = {
  "apiVersion": "v1",
  "name": "SomePageName",
  "module": "foo",
  "uniqueId": "foo_SomePageName",
  "composerSettings": null,
  "maxAutoSaves": 100,
  "body": "<skuidpage><models/></skuidpage>",
};

const v2PageObject = {
  "apiVersion": "v2",
  "name": "AnotherPageName",
  "module": null,
  "uniqueId": "_AnotherPageName",
  "composerSettings": { },
  "maxAutoSaves": 98,
  "body": `<skuid__page><models><model id="Accs"></model></models></skuid__page>`,
};

describe('skuid page pull', () => {
  const clean = () => {
    rmSync('foo');
    rmSync('skuidpages');
  };

  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();
  const config = new Config({ root: resolve(__dirname, '../../../package.json') });

  before(async () => {
    await $$.stubAuths(testOrg);
    await config.load();

    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    };
  });

  after(async () => {
    clean();
    $$.restore();
  });

  it('runs skuid:page:pull with no page or module specified', async () => {
    const cmd = new Pull(
      // -o shouldn't be necessary
      ['-o', 'DevOrg'],
      config
    );

    const result = await cmd.run();
    expect(result).to.equal({});
  });
});
