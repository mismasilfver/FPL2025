import { createDefaultRoot } from '../js/storage-module.js';

function createJsonResponse(data, status = 200) {
  const ok = status >= 200 && status < 300;
  const body = data === undefined ? '' : JSON.stringify(data);

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    async text() {
      return body;
    }
  };
}

export function createSQLiteApiMock({
  baseUrl = 'http://localhost/api/storage',
  initialRoot
} = {}) {
  let state = JSON.parse(JSON.stringify(initialRoot || createDefaultRoot()));

  const ensureTrailingSlash = (url) => (url.endsWith('/') ? url.slice(0, -1) : url);
  const normalizedBase = ensureTrailingSlash(baseUrl);

  const getState = () => JSON.parse(JSON.stringify(state));

  const fetchMock = jest.fn(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const path = url.replace(normalizedBase, '').replace(/^\//, '');

    if (path === 'root') {
      if (method === 'GET') {
        return createJsonResponse(getState());
      }

      if (method === 'PUT') {
        const payload = options.body ? JSON.parse(options.body) : {};
        state = JSON.parse(JSON.stringify(payload));
        return createJsonResponse(getState());
      }

      return createJsonResponse({ message: `Unsupported method: ${method}` }, 405);
    }

    return createJsonResponse({ message: `Unsupported route: ${path}` }, 404);
  });

  return {
    fetchMock,
    getState
  };
}
