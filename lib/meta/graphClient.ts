import { DEFAULT_GRAPH_API_VERSION } from './constants';

export interface MetaGraphError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
  is_transient?: boolean;
}

export class MetaGraphApiException extends Error {
  public code: number;
  public subcode?: number;
  public type: string;
  public fbtraceId?: string;

  constructor(error: MetaGraphError) {
    super(error.message || 'Meta Graph API Error');
    this.name = 'MetaGraphApiException';
    this.code = error.code;
    this.subcode = error.error_subcode;
    this.type = error.type;
    this.fbtraceId = error.fbtrace_id;
  }
}

export class MetaGraphClient {
  private version: string;
  private baseUrl: string;

  constructor(version: string = DEFAULT_GRAPH_API_VERSION) {
    this.version = version;
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
  }

  /**
   * Execute a GET request against Meta Graph API
   */
  async get<T = any>(endpoint: string, accessToken?: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json();
    if (data.error) {
      throw new MetaGraphApiException(data.error);
    }
    return data as T;
  }

  /**
   * Execute a POST request against Meta Graph API
   */
  async post<T = any>(endpoint: string, accessToken?: string, body: Record<string, unknown> = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      cache: 'no-store',
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.error) {
      throw new MetaGraphApiException(data.error);
    }
    return data as T;
  }

  /**
   * Execute a DELETE request against Meta Graph API
   */
  async delete<T = any>(endpoint: string, accessToken?: string): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      cache: 'no-store',
    });

    const data = await response.json();
    if (data.error) {
      throw new MetaGraphApiException(data.error);
    }
    return data as T;
  }
}

export const metaGraphClient = new MetaGraphClient();
