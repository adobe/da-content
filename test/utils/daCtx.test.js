import { describe, test, expect } from 'vitest';
import { getDaCtx } from '../../src/utils/daCtx.js';

describe('getDaCtx', () => {
  const mockEnv = {
    AEM_BUCKET_NAME: 'test-bucket'
  };

  describe('basic path parsing', () => {
    test('should parse simple org/site path', () => {
      const pathname = '/org/site';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/site'
      });
    });

    test('should parse org/site/page path', () => {
      const pathname = '/org/site/page';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/page'
      });
    });

    test('should parse org/site/page/subpage path', () => {
      const pathname = '/org/site/page/subpage';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/page/subpage'
      });
    });
  });

  describe('file extensions', () => {
    test('should handle HTML files', () => {
      const pathname = '/org/site/page.html';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/page'
      });
    });

    test('should handle other file types', () => {
      const pathname = '/org/site/image.jpg';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/image.jpg'
      });
    });

    test('should handle files with multiple dots', () => {
      const pathname = '/org/site/config.prod.json';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/config.prod.json'
      });
    });
  });

  describe('edge cases', () => {
    test('should handle trailing slash', () => {
      const pathname = '/org/site/';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/index'
      });
    });

    test('should handle root path', () => {
      const pathname = '/';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/'
      });
    });

    test('should handle single org path', () => {
      const pathname = '/org';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/'
      });
    });

    test('should handle empty path parts', () => {
      const pathname = '/org//site//page';
      const result = getDaCtx(mockEnv, pathname);

      expect(result).toEqual({
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
        aemPathname: '/page'
      });
    });
  });

  describe('case sensitivity', () => {
    test('should convert to lowercase', () => {
      const pathname = '/ORG/SITE/PAGE';
      const result = getDaCtx(mockEnv, pathname);

      expect(result.org).toBe('org');
      expect(result.site).toBe('site');
      expect(result.name).toBe('page');
    });
  });

  describe('bucket configuration', () => {
    test('should use environment bucket name', () => {
      const customEnv = { AEM_BUCKET_NAME: 'custom-bucket' };
      const pathname = '/org/site';
      const result = getDaCtx(customEnv, pathname);

      expect(result.bucket).toBe('custom-bucket');
    });
  });
});
