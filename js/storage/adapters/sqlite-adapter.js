import { AppError } from '../../utils/app-error.js';

async function parseResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new AppError(`Failed to parse JSON response: ${error.message}`, { code: 'JSON_PARSE_ERROR', context: { originalError: error } });
    }
  }

  if (!response.ok) {
    throw new AppError(data?.message || response.statusText || 'Request failed', {
      code: 'HTTP_ERROR',
      context: { status: response.status, details: data?.details }
    });
  }

  return data;
}

export class SQLiteAdapter {
  constructor({ baseUrl = '/api/storage', fetchImpl, storageKey = 'fpl-team-data' } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl || (typeof window !== 'undefined' ? window.fetch.bind(window) : null);
    this.storageKey = storageKey;

    if (typeof this.fetch !== 'function') {
      throw new Error('SQLiteAdapter requires a fetch implementation.');
    }
  }

  async initialize() {
    await this.getRootData();
  }

  async getRootData() {
    const response = await this.fetch(`${this.baseUrl}/root`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    return parseResponse(response);
  }

  async setRootData(root) {
    const response = await this.fetch(`${this.baseUrl}/root`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(root)
    });
    await parseResponse(response);
    return root;
  }

  async getItem(key) {
    if (key !== this.storageKey) return null;
    const root = await this.getRootData();
    return JSON.stringify(root);
  }

  async setItem(key, value) {
    if (key !== this.storageKey) return;
    const payload = typeof value === 'string' ? JSON.parse(value) : value;
    await this.setRootData(payload);
  }
}
