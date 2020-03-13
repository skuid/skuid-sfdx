import { expect, test } from '@salesforce/command/lib/test';
import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

const v1PageObject = {
  "apiVersion": "v1",
  "name": "SomePageName",
  "module": "foo",
  "uniqueId": "foo__SomePageName",
  "composerSettings": null,
  "maxAutoSaves": 100,
  "body": "<skuidpage><models/></skuidpage>",
};
const v2PageObject = {
  "apiVersion": "v2",
  "name": "AnotherPageName",
  "module": null,
  "uniqueId": "__AnotherPageName",
  "composerSettings": { },
  "maxAutoSaves": 98,
  "body": "<skuid__page><models/></skuid__page>",
}

describe('skuid:page:pull', () => {
  test
    .withOrg({ username: 'test@org.com' }, true)
    .withConnectionRequest(request => {
      const requestMap = ensureJsonMap(request);
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages/)) {
        return Promise.resolve(JSON.stringify({
          "foo__SomePageName": v1PageObject,
          "__AnotherPageName": v2PageObject,
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
          "__AnotherPageName": v2PageObject,
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
          "foo__SomePageName": v1PageObject,
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
      if (ensureString(requestMap.url).match(/services\/apexrest\/skuid\/api\/v1\/pages\?page=SomePageName%2CAnotherPageName/)) {
        return Promise.resolve(JSON.stringify({
          "foo__SomePageName": v1PageObject,
          "__AnotherPageName": v2PageObject,
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
          "foo__SomePageName": v1PageObject,
          "__AnotherPageName": v2PageObject,
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
            "foo__SomePageName": v1PageObject,
            "__AnotherPageName": v2PageObject,
          }
        }
      })
    });
});
