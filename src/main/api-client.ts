import withQuery from 'with-query';
import type { StoredTimingRead, TimingRead, RacemapEvent } from './types';
import { error } from './functions';

const RACEMAP_API_HOST = process.env.RACEMAP_API_HOST || 'https://racemap.com';

class APIClient {
  _host = '';
  _headers: HeadersInit = {};

  constructor(headers: HeadersInit = {}) {
    this._host = RACEMAP_API_HOST;
    this._headers = headers;
  }

  async _fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${this._host}${path}`, {
      ...options,
      headers: { ...this._headers, ...options.headers },
    });
    if (!res.ok) {
      const err = new Error(`Error: ${res.status} ${res.statusText} ${res.url}`);
      error('fetch', err);
      throw err;
    }
    return res;
  }

  async _getJSON(path: string, headers?: HeadersInit): Promise<any> {
    const res = await this._fetch(path, {
      headers: { ...headers, Accept: 'application/json' },
    });
    return res.json();
  }

  async _postJSON(path: string, data: Record<string, any> = {}): Promise<Response> {
    return await this._fetch(path, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async checkToken(): Promise<boolean> {
    try {
      await this._getJSON('/api/inspect');
      return true;
    } catch (err) {
      return false;
    }
  }

  async getMyEvents(): Promise<Array<RacemapEvent>> {
    const res = await this._getJSON('/api/events');
    console.log('getMyEvents', res);
    return res;
  }

  async checkAvailibility(): Promise<boolean> {
    const isAvail = await this.sendTimingReadsAsJSON([]);
    if (isAvail.status === 200) {
      return true;
    }
    return false;
  }

  async sendTimingReadsAsJSON(TimingReads: Array<TimingRead>): Promise<Response> {
    return this._postJSON('/services/trackping/api/v1/timing_input/pings', TimingReads);
  }

  async getTimingReads(query: {
    timingIds: Array<string>;
    transponderIds?: Array<string>;
    startTime?: string;
    endTime?: string;
    firstReceive?: string;
    lastReceive?: string;
  }): Promise<Array<StoredTimingRead>> {
    return this._getJSON(withQuery('/services/trackping/api/v1/timing_output/pings', query));
  }
}

export default APIClient;
