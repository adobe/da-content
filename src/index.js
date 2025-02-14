import { getDaCtx } from './utils/daCtx';

import getObject from './storage/object';

import { get404, daResp, getRobots } from './responses/index';
import getFromAdmin from './storage/admin';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/favicon.ico') return get404();
    if (url.pathname === '/robots.txt') return getRobots();
    if ([...url.pathname].filter((c) => c === '.').length > 1) return get404(); 


    const daCtx = getDaCtx(url.pathname);
    const objResp = await getObject(env, daCtx);

    const [, org, site] = url.pathname.split('/');

    if (!org || !site) return get404();

    if (org === 'andreituicu') {
      return await getFromAdmin(req);
    }

    return daResp(objResp);
  },
};
