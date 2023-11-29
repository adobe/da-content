import { getDaCtx } from './utils/daCtx';

import getObject from './storage/object';

import { get404, getRobots } from './responses/index';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    console.log(url.pathname);
    if (url.pathname === '/favicon.ico') return get404();
    if (url.pathname === '/robots.txt') return getRobots();

    const daCtx = getDaCtx(url.pathname);
    return getObject(env, daCtx);

    return new Response(JSON.stringify(daCtx));
  },
};
