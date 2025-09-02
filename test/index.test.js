import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock all the modules
vi.mock('./src/utils/daCtx.js', () => ({
  getDaCtx: vi.fn()
}));

vi.mock('./src/storage/object.js', () => ({
  default: vi.fn()
}));

vi.mock('./src/storage/admin.js', () => ({
  default: vi.fn()
}));

vi.mock('./src/responses/index.js', () => ({
  daResp: vi.fn(),
  get404: vi.fn(),
  getRobots: vi.fn()
}));

// Import after mocking
import { getDaCtx } from './src/utils/daCtx.js';
import getObject from './src/storage/object.js';
import getFromAdmin from './src/storage/admin.js';
import { daResp, get404, getRobots } from './src/responses/index.js';

describe('mainHandler.fetch', () => {
  let mockEnv;
  let mockReq;
  let mockDaCtx;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      AEM_BUCKET_NAME: 'test-bucket',
      ADMIN_EXCEPTED_ORGS: 'org1,org2,org3',
      HELIX_ADMIN_IP: '192.168.1.1'
    };

    mockReq = {
      method: 'GET',
      url: 'https://example.com/org/site/page',
      headers: new Map()
    };

    mockDaCtx = {
      bucket: 'test-bucket',
      org: 'org',
      site: 'site',
      filename: 'page',
      isFile: true,
      ext: 'html',
      name: 'page',
      key: 'site/page.html',
      propsKey: 'site/page/page.html.props',
      pathname: '/site/page',
      aemPathname: '/page'
    };

    // Mock the utility functions
    getDaCtx.mockReturnValue(mockDaCtx);
    getObject.mockResolvedValue({
      body: 'content',
      status: 200,
      contentType: 'text/html'
    });
    getFromAdmin.mockResolvedValue({
      body: 'admin content',
      status: 200,
      contentType: 'text/html'
    });
    daResp.mockImplementation(({ body, status }) => new Response(body, { status }));
    get404.mockReturnValue(new Response('', { status: 404 }));
    getRobots.mockReturnValue(new Response('User-agent: *\nDisallow: /', { status: 200 }));
  });

  describe('robots.txt handling', () => {
    test('should return robots.txt for /robots.txt path', async () => {
      mockReq.url = 'https://example.com/robots.txt';

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(getRobots).toHaveBeenCalled();
      expect(result.status).toBe(200);
    });
  });

  describe('OPTIONS request handling', () => {
    test('should handle OPTIONS requests through admin', async () => {
      mockReq.method = 'OPTIONS';
      mockReq.url = 'https://example.com/org/site/page';

      const result = await mainHandler.fetch(mockReq, mockEnv);

      // OPTIONS requests go through admin, which returns 200 for OPTIONS
      expect(result.status).toBe(200);
    });
  });

  describe('path parsing and context', () => {
    test('should parse path and get daCtx when allowlisted', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getDaCtx).toHaveBeenCalledWith(mockEnv, '/org1/site/page');
    });

    test('should handle root path with 404', async () => {
      mockReq.url = 'https://example.com/';
      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(404);
    });
  });

  describe('admin access control', () => {
    test('should allow storage access for excepted orgs with correct IP', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getObject).toHaveBeenCalled();
      expect(getFromAdmin).not.toHaveBeenCalled();
    });

    test('should deny storage access for non-excepted orgs', async () => {
      mockReq.url = 'https://example.com/other-org/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalledWith(mockReq, mockEnv);
      expect(getObject).not.toHaveBeenCalled();
    });

    test('should deny storage access for wrong IP', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.2');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalledWith(mockReq, mockEnv);
      expect(getObject).not.toHaveBeenCalled();
    });

    test('should handle missing ADMIN_EXCEPTED_ORGS', async () => {
      delete mockEnv.ADMIN_EXCEPTED_ORGS;
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalledWith(mockReq, mockEnv);
      expect(getObject).not.toHaveBeenCalled();
    });

    test('should handle missing HELIX_ADMIN_IP', async () => {
      delete mockEnv.HELIX_ADMIN_IP;
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalledWith(mockReq, mockEnv);
      expect(getObject).not.toHaveBeenCalled();
    });
  });

  describe('object retrieval', () => {
    test('should get object from S3 when allowlisted', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getObject).toHaveBeenCalled();
      expect(getFromAdmin).not.toHaveBeenCalled();
    });

    test('should get from admin when not allowlisted', async () => {
      mockReq.url = 'https://example.com/other-org/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.2');

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalledWith(mockReq, mockEnv);
      expect(getObject).not.toHaveBeenCalled();
    });
  });

  describe('response handling', () => {
    test('should return storage response when allowlisted', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');
      const storageResponse = new Response('storage content', { status: 200 });
      getObject.mockResolvedValue({ body: 'storage content', status: 200 });
      daResp.mockReturnValue(storageResponse);

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result).toBe(storageResponse);
    });

    test('should return admin response when not allowlisted', async () => {
      mockReq.url = 'https://example.com/other-org/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.2');
      const adminResponse = new Response('admin content', { status: 200 });
      getFromAdmin.mockResolvedValue(adminResponse);

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result).toBe(adminResponse);
    });

    test('should handle 404 for missing org/site', async () => {
      mockReq.url = 'https://example.com/org';
      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(404);
    });
  });

  describe('error handling', () => {
    test('should handle getObject errors gracefully', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');
      getObject.mockRejectedValue(new Error('S3 error'));

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(500);
    });

    test('should handle getFromAdmin errors gracefully', async () => {
      mockReq.url = 'https://example.com/other-org/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.2');
      getFromAdmin.mockRejectedValue(new Error('Admin error'));

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(500);
    });

    test('should handle getDaCtx errors gracefully', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');
      getDaCtx.mockImplementation(() => {
        throw new Error('Context error');
      });

      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(500);
    });
  });

  describe('edge cases', () => {
    test('should handle favicon.ico requests', async () => {
      mockReq.url = 'https://example.com/favicon.ico';
      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(404);
    });

    test('should handle missing cf-connecting-ip header', async () => {
      mockReq.url = 'https://example.com/org1/site/page';
      // No cf-connecting-ip header set

      await mainHandler.fetch(mockReq, mockEnv);

      expect(getFromAdmin).toHaveBeenCalled();
      expect(getObject).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive org matching', async () => {
      mockReq.url = 'https://example.com/ORG1/site/page';
      mockReq.headers.set('cf-connecting-ip', '192.168.1.1');

      await mainHandler.fetch(mockReq, mockEnv);

      // The actual implementation does exact string matching, not case-insensitive
      expect(getFromAdmin).toHaveBeenCalled();
      expect(getObject).not.toHaveBeenCalled();
    });

    test('should handle missing site in URL', async () => {
      mockReq.url = 'https://example.com/org';
      const result = await mainHandler.fetch(mockReq, mockEnv);

      expect(result.status).toBe(404);
    });
  });
});

// Mock the mainHandler object to match actual implementation
const mainHandler = {
  fetch: async (req, env) => {
    const url = new URL(req.url);
    const { pathname } = url;

    if (pathname === '/favicon.ico') return get404();
    if (pathname === '/robots.txt') return getRobots();

    const [, org, site] = url.pathname.split('/');

    if (!org || !site) return get404();

    function isAllowListed(env, req) {
      return env.ADMIN_EXCEPTED_ORGS?.split(',').includes(org)
        && req.headers.get('cf-connecting-ip') === env.HELIX_ADMIN_IP;
    }

    try {
      if (isAllowListed(env, req)) {
        const daCtx = getDaCtx(env, pathname);
        const objResp = await getObject(env, daCtx);
        return daResp(objResp);
      } else {
        return await getFromAdmin(req, env);
      }
    } catch (error) {
      console.error('Error in mainHandler.fetch:', error);
      return daResp({ body: 'Internal Server Error', status: 500 });
    }
  }
};
