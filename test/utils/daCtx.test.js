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
import { getDaCtx } from '../../src/utils/daCtx.js';

describe('getDaCtx', () => {
  const mockEnv = {
    AEM_BUCKET_NAME: 'test-bucket',
  };

  describe('basic path parsing', () => {
    it('parses simple org/site path', () => {
      const pathname = '/org/site';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: undefined,
        filename: 'site',
        isFile: true,
        ext: 'html',
        name: 'site',
        key: 'site.html',
        propsKey: 'site.html.props',
        pathname: '/site',
        aemPathname: '/site',
      });
    });

    it('parses org/site/page path', () => {
      const pathname = '/org/site/page';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'page',
        isFile: true,
        ext: 'html',
        name: 'page',
        key: 'site/page.html',
        propsKey: 'site/page.html.props',
        pathname: '/site/page',
        aemPathname: '/page',
      });
    });

    it('parses org/site/page/subpage path', () => {
      const pathname = '/org/site/page/subpage';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'subpage',
        isFile: true,
        ext: 'html',
        name: 'subpage',
        key: 'site/page/subpage.html',
        propsKey: 'site/page/subpage.html.props',
        pathname: '/site/page/subpage',
        aemPathname: '/page/subpage',
      });
    });
  });

  describe('file extensions', () => {
    it('handles HTML files', () => {
      const pathname = '/org/site/page.html';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'page.html',
        isFile: true,
        ext: 'html',
        name: 'page',
        key: 'site/page.html.html',
        propsKey: 'site/page.html.html.props',
        pathname: '/site/page',
        aemPathname: '/page',
      });
    });

    it('handles other file types', () => {
      const pathname = '/org/site/image.jpg';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'image.jpg',
        isFile: true,
        ext: 'jpg',
        name: 'image',
        key: 'site/image.jpg',
        propsKey: 'site/image.jpg.props',
        pathname: '/site/image.jpg',
        aemPathname: '/image.jpg',
      });
    });

    it('handles files with multiple dots', () => {
      const pathname = '/org/site/config.prod.json';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'config.prod.json',
        isFile: true,
        ext: 'json',
        name: 'config.prod',
        key: 'site/config.prod.json',
        propsKey: 'site/config.prod.json.props',
        pathname: '/site/config.prod.json',
        aemPathname: '/config.prod.json',
      });
    });
  });

  describe('edge cases', () => {
    it('handles trailing slash', () => {
      const pathname = '/org/site/';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'index',
        isFile: true,
        ext: 'html',
        name: 'index',
        key: 'site/index.html',
        propsKey: 'site/index.html.props',
        pathname: '/site/index',
        aemPathname: '/index',
      });
    });

    it('handles root path', () => {
      const pathname = '/';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: '',
        site: undefined,
        filename: '',
        isFile: true,
        ext: 'html',
        name: '',
        key: '.html',
        propsKey: '.html.props',
        pathname: '/',
        aemPathname: '/',
      });
    });

    it('handles single org path', () => {
      const pathname = '/org';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: undefined,
        filename: '',
        isFile: true,
        ext: 'html',
        name: '',
        key: '.html',
        propsKey: '.html.props',
        pathname: '/',
        aemPathname: '/',
      });
    });

    it('handles empty path parts', () => {
      const pathname = '/org//site//page';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).to.deep.equal({
        bucket: 'test-bucket',
        org: 'org',
        site: 'site',
        filename: 'page',
        isFile: true,
        ext: 'html',
        name: 'page',
        key: 'site/page.html',
        propsKey: 'site/page.html.props',
        pathname: '/site/page',
        aemPathname: '/page',
      });
    });
  });

  describe('case sensitivity', () => {
    it('converts to lowercase', () => {
      const pathname = '/ORG/SITE/PAGE';
      const result = getDaCtx(mockEnv, pathname);

      expect(result.org).to.equal('org');
      expect(result.site).to.equal('site');
      expect(result.name).to.equal('page');
    });
  });

  describe('bucket configuration', () => {
    it('uses environment bucket name', () => {
      const customEnv = { AEM_BUCKET_NAME: 'custom-bucket' };
      const pathname = '/org/site';
      const result = getDaCtx(customEnv, pathname);

      expect(result.bucket).to.equal('custom-bucket');
    });
  });
});
