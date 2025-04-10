import { Config } from '@oclif/core';
import { resolve } from 'path';
import { sync as rmSync } from 'rimraf';
// import { expect } from '@salesforce/command/lib/test';
import { expect } from 'chai';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup';
import { AnyJson, ensureJsonMap, ensureString } from '@salesforce/ts-types';
import Pull from "../../../../src/commands/skuid/page/pull";
import { formatXml } from '../../../../src/helpers/xml';

const v1PageObject = {
  "apiVersion": "v1",
  "name": "SomePageName",
  "module": "foo",
  "uniqueId": "foo_SomePageName",
  "composerSettings": null,
  "maxAutoSaves": 100,
  "body": "<skuidpage><models/></skuidpage>",
};

const v1PageObjectWithSlashModule = {
  "apiVersion": "v1",
  "name": "Some/Page\\Name",
  "module": "foo/bar\\baz",
  "uniqueId": "foo/bar\\baz_Some/Page\\Name",
  "composerSettings": null,
  "maxAutoSaves": "100",
  "body": "<skuidpage><models/></skuidpage>"
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

  const clean = () => {
    rmSync('foo');
    rmSync('skuidpages');
  };

  const $$ = new TestContext();
  const testData = new MockTestOrgData();
  const config = new Config({ root: resolve(__dirname, '../../../package.json') });

  beforeEach(async () => {
    await $$.stubAuths(testData);
    await config.load();
    clean();
  });

  afterEach(async () => {
    $$.restore();
    clean();
  });

  it('runs skuid:page:pull with no page or module specified', async () => {
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

    const cmd = new Pull(
      ["--target-org", testData.username],
      config
    );

    const result = await cmd.run();
    expect(result).to.equal('Wrote 2 pages to skuidpages');
  });

  it('only requests pages with no module, and respects dir ', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?nomodule=true/)) {
        return Promise.resolve(JSON.stringify({
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    };

    const cmd = new Pull(
      ["--target-org", testData.username, '--nomodule', '--dir', 'foo'],
      config
    );

    const result = await cmd.run();
    expect(result).to.contain('Wrote 1 pages to foo');
  });

  it('only requests pages in specified module', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    }

    const cmd = new Pull(
      ["--target-org", testData.username, '--module', 'foo'],
      config
    );

    const result = await cmd.run();
    expect(result).to.contain('Wrote 1 pages to skuidpages');
  });
  
  it('removes unsafe directory characters from at-rest file names', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          "foo/bar\\baz_Some/Page\\Name": v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    }

    const cmd = new Pull(
      ["--target-org", testData.username, '--module', 'foo/bar\\baz'],
      config
    );

    const result = await cmd.run();
    expect(result).to.contain('Wrote 1 pages to skuidpages');
  });

  it('only requests specific pages', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?page=SomePageName%2CAnotherPageName/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    }

    const cmd = new Pull(
      ["--target-org", testData.username, '--page', 'SomePageName,AnotherPageName'],
      config
    );

    const result = await cmd.run();
    expect(result).to.contain('Wrote 2 pages to skuidpages');
  });

  it('returns results as json', async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    }

    const cmd = new Pull(
      ["--target-org", testData.username, '--json'],
      config
    );

    const jsonOutput = await cmd.run();
    expect(jsonOutput).to.deep.equal({
      status: 0,
      result: {
        pages: {
          "foo_SomePageName": v1PageWithPrettyXML,
          "AnotherPageName": v2PageWithPrettyXML,
        }
      }
    });
  });

  it("removes unsafe directory characters from at-rest file names in json output", async () => {
    $$.fakeConnectionRequest = (request: AnyJson): Promise<AnyJson> => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          "foo/bar\\baz_Some/Page\\Name": v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    }

    const cmd = new Pull(
      ["--target-org", testData.username, "--json", '--module', "foo/bar\\baz"],
      config
    );

    const jsonOutput = await cmd.run();
    expect(jsonOutput).to.deep.equal({
      status: 0,
      result: {
        pages: {
          "foobarbaz_SomePageName": v1PageObjectWithSlashModulePrettyXML,
        }
      }
    });
  });
});
