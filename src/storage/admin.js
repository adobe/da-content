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

export default async function getFromAdmin(req) {
  let { pathname } = new URL(req.url);

  // canonicalize path
  if (pathname.endsWith('/')) {
    pathname += 'index';
  }

  if (!pathname.includes('.')) {
    pathname += '.html';
  }

  // construct request to admin
  const url = `${AMDMIN_URL}${pathname}`;
  const reqHeaders = new Headers();

  const authHeader = getAuthHeader(req);
  if (authHeader) {
    reqHeaders.set('authorization', authHeader);
  }

  try {
    const resp = await fetch(url, {
      headers: reqHeaders,
    });
    const { status, headers } = resp;
    const body = await resp.blob();

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