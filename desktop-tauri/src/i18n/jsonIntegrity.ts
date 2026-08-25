export function assertNoDuplicateJsonKeys(raw: string): void {
  let index = 0;

  function fail(message: string): never {
    throw new Error(`Duplicate-key JSON validation failed: ${message} at offset ${index}`);
  }

  function skipWhitespace() {
    while (index < raw.length && /\s/.test(raw[index])) index += 1;
  }

  function parseString() {
    skipWhitespace();
    if (raw[index] !== '"') fail('expected string');
    const start = index;
    index += 1;
    let escaped = false;

    while (index < raw.length) {
      const ch = raw[index];
      if (escaped) {
        escaped = false;
        index += 1;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        index += 1;
        continue;
      }
      if (ch === '"') {
        index += 1;
        try {
          return JSON.parse(raw.slice(start, index));
        } catch {
          fail('invalid string escape');
        }
      }
      if (ch.charCodeAt(0) < 0x20) fail('control character in string');
      index += 1;
    }
    fail('unterminated string');
  }

  function parseNumber() {
    skipWhitespace();
    const match = raw.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) fail('invalid number');
    index += match[0].length;
  }

  function parseLiteral(value: string): void {
    skipWhitespace();
    if (!raw.startsWith(value, index)) fail(`expected ${value}`);
    index += value.length;
  }

  function parseArray() {
    index += 1;
    skipWhitespace();
    if (raw[index] === ']') {
      index += 1;
      return;
    }
    while (index < raw.length) {
      parseValue();
      skipWhitespace();
      if (raw[index] === ',') {
        index += 1;
        continue;
      }
      if (raw[index] === ']') {
        index += 1;
        return;
      }
      fail('expected array separator');
    }
    fail('unterminated array');
  }

  function parseObject() {
    index += 1;
    const keys = new Set();
    skipWhitespace();
    if (raw[index] === '}') {
      index += 1;
      return;
    }

    while (index < raw.length) {
      const key = parseString();
      if (keys.has(key)) {
        throw new Error(`Duplicate JSON key: ${key}`);
      }
      keys.add(key);

      skipWhitespace();
      if (raw[index] !== ':') fail('expected object colon');
      index += 1;
      parseValue();
      skipWhitespace();

      if (raw[index] === ',') {
        index += 1;
        skipWhitespace();
        continue;
      }
      if (raw[index] === '}') {
        index += 1;
        return;
      }
      fail('expected object separator');
    }
    fail('unterminated object');
  }

  function parseValue() {
    skipWhitespace();
    const ch = raw[index];
    if (ch === '{') return parseObject();
    if (ch === '[') return parseArray();
    if (ch === '"') {
      parseString();
      return;
    }
    if (ch === '-' || /\d/.test(ch || '')) return parseNumber();
    if (raw.startsWith('true', index)) return parseLiteral('true');
    if (raw.startsWith('false', index)) return parseLiteral('false');
    if (raw.startsWith('null', index)) return parseLiteral('null');
    fail('invalid JSON value');
  }

  parseValue();
  skipWhitespace();
  if (index !== raw.length) fail('trailing content');
}
