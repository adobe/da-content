/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
import { expect } from 'chai';
import { daResp, get404, getRobots } from '../../src/responses/index.js';

describe('daResp', () => {
  it('creates response with basic properties', () => {
    const response = daResp({ body: 'test content', status: 200 });

    expect(response).to.be.instanceOf(Response);
    expect(response.status).to.equal(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).to.equal('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).to.equal('authorization');
  });

  it('includes content type when provided', () => {
    const response = daResp({ body: '<html>content</html>', status: 200, contentType: 'text/html' });

    expect(response.headers.get('Content-Type')).to.equal('text/html');
  });

  it('sets Content-Disposition: attachment for image/svg+xml', () => {
    const resp = daResp({ body: '<svg/>', status: 200, contentType: 'image/svg+xml' });
    expect(resp.headers.get('Content-Disposition')).to.equal('attachment');
  });

  it('sets Content-Disposition: attachment for image/svg', () => {
    const resp = daResp({ body: '<svg/>', status: 200, contentType: 'image/svg' });
    expect(resp.headers.get('Content-Disposition')).to.equal('attachment');
  });

  it('sets Content-Disposition: attachment for image/svg+xml with charset', () => {
    const resp = daResp({ body: '<svg/>', status: 200, contentType: 'image/svg+xml; charset=utf-8' });
    expect(resp.headers.get('Content-Disposition')).to.equal('attachment');
  });

  it('does not set Content-Disposition for non-SVG content types', () => {
    const resp = daResp({ body: 'ok', status: 200, contentType: 'image/png' });
    expect(resp.headers.get('Content-Disposition')).to.be.null;
  });

  it('does not set Content-Disposition when contentType is missing', () => {
    const resp = daResp({ body: '', status: 404 });
    expect(resp.headers.get('Content-Disposition')).to.be.null;
  });

  it('handles different status codes', () => {
    const response = daResp({ body: 'error message', status: 404 });
    expect(response.status).to.equal(404);
  });

  it('always includes CORS headers', () => {
    const response = daResp({ body: 'test', status: 500 });
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('*');
  });
});

describe('get404', () => {
  it('returns 404 with empty body', async () => {
    const resp = get404();
    expect(resp.status).to.equal(404);
    expect(await resp.text()).to.equal('');
  });

  it('includes CORS headers', () => {
    const response = get404();
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('*');
  });
});

describe('getRobots', () => {
  it('returns 200 with disallow all body', async () => {
    const resp = getRobots();
    expect(resp.status).to.equal(200);
    expect(await resp.text()).to.include('Disallow: /');
  });

  it('includes CORS headers', () => {
    const response = getRobots();
    expect(response.headers.get('Access-Control-Allow-Origin')).to.equal('*');
  });
});
