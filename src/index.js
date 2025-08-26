import { getDaCtx } from './utils/daCtx';
import getObject from './storage/object';

import { get404, daResp, getRobots } from './responses/index';
import getFromAdmin from './storage/admin';

// https://www.aem.live/docs/security#backends-with-ip-filtering
const HELIX_ADMIN_IP = '3.227.118.73';
const EMBEDDABLE_ASSETS_EXTENSIONS = ['.avif', '.jpg', '.jpeg', '.png', '.svg', '.gif', '.mp4'];

async function getFromStorage(pathname, env) {
  const daCtx = getDaCtx(pathname);
  const objResp = await getObject(env, daCtx);
  return daResp(objResp);
}

function isEmbeddableAsset(pathname) {
  return EMBEDDABLE_ASSETS_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

function isAllowListed(env, req) {
  return env.ADMIN_EXCEPTED_ORGS?.split(',').includes(org)
    && req.headers.get('cf-connecting-ip') === HELIX_ADMIN_IP;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/favicon.ico') return get404();
    if (pathname === '/robots.txt') return getRobots();

    const [, org, site] = url.pathname.split('/');

    if (!org || !site) return get404();

    if (isEmbeddableAsset(pathname) || isAllowListed(env, req)) {
      return await getFromStorage(pathname, env);
    }

    return await getFromAdmin(req, env);
  },
};
