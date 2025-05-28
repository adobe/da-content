import { parse } from "cookie";

const AMDMIN_URL = 'https://admin.da.live/source';

function getAuthCookie(req) {
  if (!req.headers.has('cookie')) return null

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies['auth_token'];
}

function getAuthHeader(req) {
  const authCookie = getAuthCookie(req);

  if (authCookie) {
    return `Bearer ${authCookie}`;
  }

  if (req.headers.get('authorization')) {
    return req.headers.get('authorization');
  }

  const { searchParams } = new URL(req.url);
  if (searchParams.get('token')) {
    return `Bearer ${searchParams.get('token')}`;
  }

  return null;
}

function canonicalizePathname(pathname) {
  // all paths are lowercase
  pathname = pathname.toLowerCase();

  if (pathname.endsWith('/')) {
    pathname += 'index';
  }

  // remove special characters, empty parts, . and ..
  pathname = `/${pathname.split('/')
    .map((part) => part.replace(/[^a-z0-9.-]/gi, ''))
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .join('/')}`;

  // extension-less files get a html extension
  if (!pathname.split('/').pop().includes('.')) {
    pathname += '.html';
  }

  return pathname;
}

export default async function getFromAdmin(req, env) {
  if (req.method === 'OPTIONS') {
    return daResp({ body: '', status: 200 });
  }

  if (req.method !== 'GET') {
    return new Response('', { status: 405 });
  }

  let { pathname } = new URL(req.url);
  pathname = canonicalizePathname(pathname);

  // construct request to admin
  const url = `${AMDMIN_URL}${pathname}`;
  const reqHeaders = new Headers();

  const authHeader = getAuthHeader(req);
  if (authHeader) {
    reqHeaders.set('authorization', authHeader);
  }

  try {
    console.log('-> get from admin', url);
    const resp = await env.daadmin.fetch(url, {
      headers: reqHeaders,
    });
    const { status, headers } = resp;
    const body = await resp.blob();

    console.log('<- admin responded with:', status);
    return new Response(body, { status, headers });
  } catch (e) {
    const msg = 'Failed to fetch from admin';
    console.error(msg, e);
    return new Response(
      '',
      {
        status: 503,
        headers: { 'x-error': msg },
      },
    );
  } 
}
