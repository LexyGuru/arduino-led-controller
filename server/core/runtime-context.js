'use strict';

const RUNTIME_CONTEXT_KEY = Symbol.for(
  'arduino-led-controller.runtime-context'
);

function freezeRuntimeContext(context) {
  if (!context || typeof context !== 'object') {
    throw new TypeError(
      'A runtime context csak objektum lehet.'
    );
  }

  return Object.freeze({
    ...context
  });
}

function setRuntimeContext(
  context,
  {
    replace = false
  } = {}
) {
  if (
    globalThis[RUNTIME_CONTEXT_KEY] &&
    !replace
  ) {
    throw new Error(
      'A runtime context már inicializálva van.'
    );
  }

  const frozenContext =
    freezeRuntimeContext(context);

  globalThis[RUNTIME_CONTEXT_KEY] =
    frozenContext;

  return frozenContext;
}

function getRuntimeContext() {
  const context =
    globalThis[RUNTIME_CONTEXT_KEY];

  if (!context) {
    throw new Error(
      'A runtime context még nincs inicializálva.'
    );
  }

  return context;
}

function getOptionalRuntimeContext() {
  return globalThis[RUNTIME_CONTEXT_KEY] || null;
}

function clearRuntimeContextForTests() {
  delete globalThis[RUNTIME_CONTEXT_KEY];
}

module.exports = {
  RUNTIME_CONTEXT_KEY,
  clearRuntimeContextForTests,
  getOptionalRuntimeContext,
  getRuntimeContext,
  setRuntimeContext
};
