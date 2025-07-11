import { getDaCtx } from './utils/daCtx';
import getObject from './storage/object';
import { getCookie } from './cookie';
import { get404, daResp, getRobots } from './responses/index';
import getFromAdmin from './storage/admin';

const EMBEDDABLE_ASSETS_EXTENSIONS = [ '.jpg', '.jpeg', '.png', '.svg', '.pdf', '.gif', '.mp4', '.svg' ];

async function getFromStorage(pathname, env) {
  const daCtx = getDaCtx(pathname);
  const objResp = await getObject(env, daCtx);
  return daResp(objResp);
}

function isEmbeddableAsset(pathname) {
  return EMBEDDABLE_ASSETS_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/favicon.ico') return get404();
    if (pathname === '/robots.txt') return getRobots();

    const [, org, site, root ] = url.pathname.split('/');

    if (root === '.gimme_cookie') {
      return getCookie(req, org, site);
    }
 
    if (!org || !site) return get404();

    if (org === 'andreituicu') {
      return await getFromAdmin(req, env);
    }

    if (isEmbeddableAsset(pathname) || env.ADMIN_EXCEPTED_ORGS?.split(',').includes(org)) {
      return await getFromStorage(pathname, env);
    }

    return await getFromAdmin(req, env);
  },
};
