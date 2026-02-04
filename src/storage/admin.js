/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { parse } from 'cookie';
import { daResp } from '../responses/index.js';
import { isEmbeddableAsset } from './utils.js';

const AMDMIN_URL = 'https://admin.da.live/source';

function getAuthCookie(req) {
  if (!req.headers.has('cookie')) return null;

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parse(cookieHeader);
  return cookies.auth_token;
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
  let canonicalized = pathname;
  const isAsset = isEmbeddableAsset(pathname);

  // all paths are lowercase
  canonicalized = canonicalized.toLowerCase();

  if (canonicalized.endsWith('/')) {
    canonicalized += 'index';
  }

  // remove special characters (skip for assets), empty parts, . and ..
  const parts = canonicalized.split('/');
  canonicalized = `/${parts
    // we needed to deactivate the special character removal for assets because 
    // we already had a lot of assets with special characters in the name
    .map((part) => (isAsset ? part : part.replace(/[^a-z0-9.-]/gi, '')))
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .join('/')}`;

  // extension-less files get a html extension
  if (!canonicalized.split('/').pop().includes('.')) {
    canonicalized += '.html';
  }

  return canonicalized;
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
    // eslint-disable-next-line no-console
    console.log('-> get from admin', url);
    const resp = await env.daadmin.fetch(url, {
      headers: reqHeaders,
    });
    const { status, headers } = resp;
    const body = await resp.blob();

    // eslint-disable-next-line no-console
    console.log('<- admin responded with:', status);
    return new Response(body, { status, headers });
  } catch (e) {
    const msg = 'Failed to fetch from admin';
    // eslint-disable-next-line no-console
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
