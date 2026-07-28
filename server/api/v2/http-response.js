'use strict';

const { randomUUID } = require('crypto');

const API_VERSION = '2';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function normalizeRequestId(value) {
  const candidate = Array.isArray(value)
    ? value[0]
    : value;

  if (
    typeof candidate === 'string' &&
    REQUEST_ID_PATTERN.test(candidate)
  ) {
    return candidate;
  }

  return randomUUID();
}

function apiV2RequestContext(req, res, next) {
  const requestId = normalizeRequestId(
    req.get?.('X-Request-ID') ||
    req.headers?.['x-request-id']
  );

  req.apiV2 = {
    requestId,
    startedAt: Date.now()
  };

  res.set('X-Request-ID', requestId);
  next();
}

function buildMeta(req, extraMeta = {}) {
  const context = req.apiV2 || {
    requestId: randomUUID(),
    startedAt: Date.now()
  };

  return {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    apiVersion: API_VERSION,
    durationMs: Math.max(
      0,
      Date.now() - context.startedAt
    ),
    ...extraMeta
  };
}

function setApiResponseHeaders(res) {
  res.set({
    'Cache-Control':
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
}

function sendSuccess(
  req,
  res,
  data,
  {
    statusCode = 200,
    meta = {}
  } = {}
) {
  setApiResponseHeaders(res);

  return res.status(statusCode).json({
    success: true,
    data: data ?? null,
    meta: buildMeta(req, meta)
  });
}

function normalizeError(error) {
  const statusCode =
    Number.isInteger(error?.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
      ? error.statusCode
      : 500;

  const expose = statusCode < 500 ||
    error?.expose === true;

  return {
    statusCode,
    code:
      typeof error?.code === 'string' &&
      error.code.trim()
        ? error.code.trim()
        : 'INTERNAL_ERROR',
    message: expose &&
      typeof error?.message === 'string' &&
      error.message.trim()
        ? error.message.trim()
        : 'Belső szerverhiba történt.',
    details: expose
      ? error?.details ?? null
      : null
  };
}

function sendError(req, res, error) {
  const normalized = normalizeError(error);

  setApiResponseHeaders(res);

  return res.status(normalized.statusCode).json({
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details
    },
    meta: buildMeta(req)
  });
}

module.exports = {
  API_VERSION,
  apiV2RequestContext,
  buildMeta,
  sendSuccess,
  sendError,
  setApiResponseHeaders
};
