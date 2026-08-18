/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */
/* OpenAPI verzió: 5.6.1-beta.1 */

export type ApiPrimitive = string | number | boolean | null;
export type ApiJson = ApiPrimitive | ApiJson[] | { [key: string]: ApiJson };

export type ApiSuccess = {
  "success": true;
  "data": unknown;
  "meta": {

};
};

export type ApiError = {
  "success": false;
  "error": {
  "code": string;
  "message": string;
  "details"?: unknown;
};
  "meta": {

};
};

export type Color = [number, number, number] | string | {
  "red": number;
  "green": number;
  "blue": number;
};

export type LedCommand = {
  "enabled"?: boolean;
  "brightness"?: number;
  "effect"?: number;
  "speed"?: number;
  "color"?: Color;
};

export type PortableSchedule = {
  "id"?: string;
  "day": number;
  "time": string;
  "leds": Array<LedCommand & {
  "id": number;
}>;
};

export type ManagedApiTokenCreate = {
  "label"?: string;
  "role"?: "admin" | "operator" | "viewer";
  "enabled"?: boolean;
  "expiresAt"?: unknown;
};

export type ManagedApiTokenUpdate = {
  "label"?: string;
  "role"?: "admin" | "operator" | "viewer";
  "enabled"?: boolean;
  "expiresAt"?: unknown;
};

export type FirmwareRollbackRequest = {
  "backupId": string;
};

export interface ApiRequestOptions {
  path?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiClientConfiguration {
  baseUrl?: string;
  bearerToken?: string | (() => string | null | undefined);
  csrfToken?: string | (() => string | null | undefined);
  credentials?: RequestCredentials;
  fetchImplementation?: typeof fetch;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
