import { getDaCtx } from './utils/daCtx';

import getObject from './storage/object';

import { get404, getResponse, getRobots } from './responses/index';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/favicon.ico') return get404();
    if (url.pathname === '/robots.txt') return getRobots();

    const daCtx = getDaCtx(url.pathname);
    const respProps = await getObject(env, daCtx);

    return getResponse(respProps);
  },
};
