import { expect, test } from '@salesforce/command/lib/test';
import { ensureJsonMap, ensureString } from '@salesforce/ts-types';
import { sync as rmSync } from 'rimraf';
import { formatXml } from '../../../../src/helpers/formatXml';

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

describe('skuid:page:pull', () => {

  const clean = () => {
    rmSync('foo');
    rmSync('skuidpages');
  };

  before(clean);
  after(clean);

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com'])
    .it('runs skuid:page:pull with no page or module specified', ctx => {
      expect(ctx.stdout).to.contain('Wrote 2 pages to skuidpages');
    });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?nomodule=true/)) {
        return Promise.resolve(JSON.stringify({
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com', '--nomodule', '--dir', 'foo'])
    .it('only requests pages with no module, and respects dir ', ctx => {
      expect(ctx.stdout).to.contain('Wrote 1 pages to foo');
    });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com', '--module', 'foo'])
    .it('only requests pages in specified module', ctx => {
      expect(ctx.stdout).to.contain('Wrote 1 pages to skuidpages');
    });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          "foo/bar\\baz_Some/Page\\Name": v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com', '--module', 'foo/bar\\baz'])
    .it('removes unsafe directory characters from at-rest file names', ctx => {
      expect(ctx.stdout).to.contain('Wrote 1 pages to skuidpages');
    });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?page=SomePageName%2CAnotherPageName/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com', '--page', 'SomePageName,AnotherPageName'])
    .it('only requests specific pages', ctx => {
      expect(ctx.stdout).to.contain('Wrote 2 pages to skuidpages');
    });

  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          "foo_SomePageName": v1PageObject,
          "_AnotherPageName": v2PageObject,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(['skuid:page:pull', '--targetusername', 'test@org.com', '--json'])
    .it('returns results as json', ctx => {
      const jsonOutput = JSON.parse(ctx.stdout);
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

  test
    .withOrg({ username: "test@org.com" }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?module=foo%2Fbar%5Cbaz/)) {
        return Promise.resolve(JSON.stringify({
          "foo/bar\\baz_Some/Page\\Name": v1PageObjectWithSlashModule,
        }));
      }
      return Promise.reject(new Error("Unexpected request"));
    })
    .stdout()
    .command(["skuid:page:pull", "--targetusername", "test@org.com", "--json", '--module', "foo/bar\\baz"])
    .it("removes unsafe directory characters from at-rest file names in json output", ctx => {
      const jsonOutput = JSON.parse(ctx.stdout);
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
