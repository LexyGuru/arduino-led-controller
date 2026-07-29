'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(
  __dirname,
  '..'
);

const DEFAULT_DOCUMENT = path.join(
  ROOT,
  'docs',
  'api',
  'openapi-v2.json'
);

const DEFAULT_OUTPUT = path.join(
  ROOT,
  'desktop-tauri',
  'src',
  'api',
  'generated'
);

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete'
]);

function pascalCase(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9]+(.)/g, (_, character) =>
      character.toUpperCase()
    )
    .replace(/^[a-z]/, (character) => character.toUpperCase());
}

function operationName(method, route) {
  const cleaned = route
    .replace(/^\/api\/v2\/?/, '')
    .replace(/\{([^}]+)\}/g, ' by $1 ');

  const suffix = pascalCase(cleaned || 'root');

  return `${method.toLowerCase()}${suffix}`;
}

function schemaToType(schema, context = {}) {
  if (!schema || typeof schema !== 'object') {
    return 'unknown';
  }

  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }

  if (Object.prototype.hasOwnProperty.call(schema, 'const')) {
    return JSON.stringify(schema.const);
  }

  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf
      .map((item) => schemaToType(item, context))
      .join(' | ');
  }

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf
      .map((item) => schemaToType(item, context))
      .join(' | ');
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf
      .map((item) => schemaToType(item, context))
      .join(' & ');
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum
      .map((item) => JSON.stringify(item))
      .join(' | ');
  }

  if (schema.type === 'array') {
    if (Array.isArray(schema.prefixItems)) {
      return `[${schema.prefixItems
        .map((item) => schemaToType(item, context))
        .join(', ')}]`;
    }

    return `Array<${schemaToType(schema.items, context)}>`;
  }

  if (
    schema.type === 'object' ||
    schema.properties ||
    schema.additionalProperties
  ) {
    const required = new Set(
      Array.isArray(schema.required)
        ? schema.required
        : []
    );

    const properties = Object.entries(
      schema.properties || {}
    ).map(([name, propertySchema]) => {
      const optional = required.has(name)
        ? ''
        : '?';

      return `  ${JSON.stringify(name)}${optional}: ${schemaToType(
        propertySchema,
        context
      )};`;
    });

    if (schema.additionalProperties) {
      properties.push(
        `  [key: string]: ${schema.additionalProperties === true
          ? 'unknown'
          : schemaToType(schema.additionalProperties, context)};`
      );
    }

    return `{\n${properties.join('\n')}\n}`;
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    default:
      return 'unknown';
  }
}

function collectOperations(document) {
  const operations = [];
  const usedNames = new Map();

  for (const [route, pathItem] of Object.entries(document.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method)) continue;

      const baseName = operation.operationId || operationName(method, route);
      const count = usedNames.get(baseName) || 0;
      usedNames.set(baseName, count + 1);
      const name = count === 0
        ? baseName
        : `${baseName}${count + 1}`;

      operations.push({
        name,
        method: method.toUpperCase(),
        route,
        summary: operation.summary || '',
        tags: operation.tags || []
      });
    }
  }

  return operations.sort((left, right) =>
    left.route.localeCompare(right.route) ||
    left.method.localeCompare(right.method)
  );
}

function generateTypes(document) {
  const schemas = document.components?.schemas || {};
  const lines = [
    '/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */',
    `/* OpenAPI verzió: ${document.info?.version || 'unknown'} */`,
    '',
    'export type ApiPrimitive = string | number | boolean | null;',
    'export type ApiJson = ApiPrimitive | ApiJson[] | { [key: string]: ApiJson };',
    ''
  ];

  for (const [name, schema] of Object.entries(schemas)) {
    lines.push(
      `export type ${name} = ${schemaToType(schema)};`,
      ''
    );
  }

  lines.push(
    'export interface ApiRequestOptions {',
    '  path?: Record<string, string | number>;',
    '  query?: Record<string, string | number | boolean | null | undefined>;',
    '  body?: unknown;',
    '  headers?: Record<string, string>;',
    '  signal?: AbortSignal;',
    '}',
    '',
    'export interface ApiClientConfiguration {',
    '  baseUrl?: string;',
    '  bearerToken?: string | (() => string | null | undefined);',
    '  csrfToken?: string | (() => string | null | undefined);',
    '  credentials?: RequestCredentials;',
    '  fetchImplementation?: typeof fetch;',
    '}',
    '',
    'export class ApiClientError extends Error {',
    '  readonly status: number;',
    '  readonly code: string;',
    '  readonly details: unknown;',
    '',
    '  constructor(status: number, code: string, message: string, details: unknown = null) {',
    '    super(message);',
    "    this.name = 'ApiClientError';",
    '    this.status = status;',
    '    this.code = code;',
    '    this.details = details;',
    '  }',
    '}',
    ''
  );

  return `${lines.join('\n')}\n`;
}

function generateOperations(document, operations) {
  const version = document.info?.version || 'unknown';
  const records = operations.map((operation) => ({
    id: operation.name,
    method: operation.method,
    path: operation.route,
    summary: operation.summary,
    tags: operation.tags
  }));

  return `/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */\n` +
    `/* OpenAPI verzió: ${version} */\n\n` +
    `export const API_V2_OPERATIONS = ${JSON.stringify(records, null, 2)} as const;\n\n` +
    `export type ApiV2Operation = typeof API_V2_OPERATIONS[number];\n` +
    `export type ApiV2OperationId = ApiV2Operation['id'];\n`;
}

function generateClient(document, operations) {
  const lines = [
    '/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */',
    `/* OpenAPI verzió: ${document.info?.version || 'unknown'} */`,
    '',
    'import {',
    '  ApiClientConfiguration,',
    '  ApiClientError,',
    '  ApiRequestOptions',
    "} from './api-v2-types';",
    '',
    'function resolveValue(value: string | (() => string | null | undefined) | undefined): string {',
    "  const resolved = typeof value === 'function' ? value() : value;",
    "  return String(resolved || '');",
    '}',
    '',
    'function interpolatePath(template: string, parameters: Record<string, string | number> = {}): string {',
    "  return template.replace(/\\{([^}]+)\\}/g, (_, name: string) => {",
    '    const value = parameters[name];',
    "    if (value === undefined || value === null || value === '') {",
    "      throw new Error(`Hiányzó útvonalparaméter: ${name}`);",
    '    }',
    '    return encodeURIComponent(String(value));',
    '  });',
    '}',
    '',
    'export class ApiV2Client {',
    '  private readonly configuration: ApiClientConfiguration;',
    '',
    '  constructor(configuration: ApiClientConfiguration = {}) {',
    '    this.configuration = configuration;',
    '  }',
    '',
    '  private async request<T>(method: string, route: string, options: ApiRequestOptions = {}): Promise<T> {',
    "    const baseUrl = String(this.configuration.baseUrl || '').replace(/\\/$/, '');",
    '    const path = interpolatePath(route, options.path);',
    '    const url = new URL(`${baseUrl}${path}`, globalThis.location?.origin || "http://localhost");',
    '',
    '    for (const [name, value] of Object.entries(options.query || {})) {',
    '      if (value !== undefined && value !== null) {',
    '        url.searchParams.set(name, String(value));',
    '      }',
    '    }',
    '',
    "    const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers || {}) };",
    '    const bearer = resolveValue(this.configuration.bearerToken);',
    '    const csrf = resolveValue(this.configuration.csrfToken);',
    '',
    "    if (bearer) headers.Authorization = `Bearer ${bearer}`;",
    "    if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['X-CSRF-Token'] = csrf;",
    '',
    '    let body: BodyInit | undefined;',
    '    if (options.body !== undefined) {',
    "      headers['Content-Type'] = headers['Content-Type'] || 'application/json';",
    '      body = JSON.stringify(options.body);',
    '    }',
    '',
    '    const fetchImplementation = this.configuration.fetchImplementation || fetch;',
    '    const response = await fetchImplementation(url, {',
    '      method,',
    '      headers,',
    '      body,',
    "      credentials: this.configuration.credentials || 'include',",
    '      signal: options.signal',
    '    });',
    '',
    "    const contentType = response.headers.get('content-type') || '';",
    "    const payload = contentType.includes('application/json') ? await response.json() : await response.text();",
    '',
    '    if (!response.ok) {',
    '      const error = payload && typeof payload === "object" ? (payload as any).error : null;',
    '      throw new ApiClientError(',
    '        response.status,',
    "        String(error?.code || 'HTTP_ERROR'),",
    "        String(error?.message || response.statusText || 'HTTP hiba'),",
    '        error?.details ?? payload',
    '      );',
    '    }',
    '',
    '    return payload as T;',
    '  }',
    ''
  ];

  for (const operation of operations) {
    lines.push(
      `  /** ${operation.summary || `${operation.method} ${operation.route}`} */`,
      `  ${operation.name}<T = unknown>(options: ApiRequestOptions = {}): Promise<T> {`,
      `    return this.request<T>(${JSON.stringify(operation.method)}, ${JSON.stringify(operation.route)}, options);`,
      '  }',
      ''
    );
  }

  lines.push('}', '');

  return `${lines.join('\n')}\n`;
}

function generateIndex() {
  return [
    '/* AUTO-GENERÁLT — NE SZERKESZD KÉZZEL. */',
    "export * from './api-v2-types';",
    "export * from './api-v2-operations';",
    "export * from './api-v2-client';",
    ''
  ].join('\n');
}

function generateOpenApiTypescript({
  documentPath = DEFAULT_DOCUMENT,
  outputDir = DEFAULT_OUTPUT
} = {}) {
  const document = JSON.parse(
    fs.readFileSync(documentPath, 'utf8')
  );

  const operations = collectOperations(document);
  fs.mkdirSync(outputDir, { recursive: true });

  const files = {
    'api-v2-types.ts': generateTypes(document),
    'api-v2-operations.ts': generateOperations(document, operations),
    'api-v2-client.ts': generateClient(document, operations),
    'index.ts': generateIndex()
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(outputDir, name),
      content,
      'utf8'
    );
  }

  return {
    version: document.info?.version || null,
    operations: operations.length,
    schemas: Object.keys(
      document.components?.schemas || {}
    ).length,
    files: Object.keys(files)
  };
}

if (require.main === module) {
  const outputDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_OUTPUT;

  const result = generateOpenApiTypescript({
    outputDir
  });

  console.log(
    `OpenAPI TypeScript kliens generálva: ${result.operations} művelet, ${result.schemas} séma.`
  );
}

module.exports = {
  DEFAULT_DOCUMENT,
  DEFAULT_OUTPUT,
  collectOperations,
  generateClient,
  generateIndex,
  generateOpenApiTypescript,
  generateOperations,
  generateTypes,
  operationName,
  pascalCase,
  schemaToType
};
