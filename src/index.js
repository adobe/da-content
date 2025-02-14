import { getDaCtx } from './utils/daCtx';
import getObject from './storage/object';

import { get404, daResp, getRobots } from './responses/index';
import getFromAdmin from './storage/admin';

const EMBEDDABLE_ASSETS_EXTENSIONS = [ '.jpg', '.jpeg', '.png', '.svg', '.pdf', '.gif' ];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/favicon.ico') return get404();
    if (url.pathname === '/robots.txt') return getRobots();
    if ([...url.pathname].filter((c) => c === '.').length > 1) return get404(); 

    const [, org, site] = url.pathname.split('/');

    if (!org || !site) return get404();

    if (org === 'andreituicu' && !EMBEDDABLE_ASSETS_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
      return await getFromAdmin(req);
    }

    const daCtx = getDaCtx(url.pathname);
    const objResp = await getObject(env, daCtx);
    return daResp(objResp);
  },
};
