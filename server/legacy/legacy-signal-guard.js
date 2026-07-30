'use strict';

const DEFAULT_SIGNALS =
  Object.freeze([
    'SIGTERM',
    'SIGINT'
  ]);

function withSuppressedSignalHandlers(
  operation,
  {
    signals =
      DEFAULT_SIGNALS,
    logger = null
  } = {}
) {
  if (typeof operation !== 'function') {
    throw new TypeError(
      'A legacy betöltési művelet függvény legyen.'
    );
  }

  const suppressed =
    new Set(
      signals.map(String)
    );

  const methods = [
    'on',
    'addListener',
    'once',
    'prependListener',
    'prependOnceListener'
  ];

  const originals =
    Object.fromEntries(
      methods.map(
        (method) => [
          method,
          process[method]
        ]
      )
    );

  const ignored = [];

  for (const method of methods) {
    process[method] =
      function guardedListener(
        eventName,
        listener
      ) {
        if (
          suppressed.has(
            String(eventName)
          )
        ) {
          ignored.push({
            method,
            signal:
              String(eventName)
          });

          logger?.info?.(
            'Legacy signal handler kihagyva.',
            {
              method,
              signal:
                String(eventName)
            }
          );

          return this;
        }

        return originals[method]
          .call(
            this,
            eventName,
            listener
          );
      };
  }

  try {
    return {
      result:
        operation(),
      ignored
    };
  } finally {
    for (const method of methods) {
      process[method] =
        originals[method];
    }
  }
}

module.exports = {
  DEFAULT_SIGNALS,
  withSuppressedSignalHandlers
};
