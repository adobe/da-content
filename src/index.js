import { getDaCtx } from './utils/daCtx';
import getObject from './storage/object';

import { get404, daResp, getRobots } from './responses/index';
import getFromAdmin from './storage/admin';

const ADMIN_ENABLED_ORGS = [
  'andreituicu',
];

const EMBEDDABLE_ASSETS_EXTENSIONS = [ '.jpg', '.jpeg', '.png', '.svg', '.pdf', '.gif', '.mp4', '.svg' ];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/favicon.ico') return get404();
    if (pathname === '/robots.txt') return getRobots();
    if ([...pathname].filter((c) => c === '.').length > 1) return get404(); 

    const [, org, site] = url.pathname.split('/');

    if (!org || !site) return get404();

    if (!EMBEDDABLE_ASSETS_EXTENSIONS.some((ext) => pathname.endsWith(ext)) && ADMIN_ENABLED_ORGS.includes(org)) {
      return await getFromAdmin(req);
    }

    const daCtx = getDaCtx(pathname);
    const objResp = await getObject(env, daCtx);
    return daResp(objResp);
  },
};
