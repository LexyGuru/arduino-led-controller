'use strict';

const crypto =
  require('crypto');

const fs =
  require('fs');

const path =
  require('path');

const DEFAULT_EXCLUDED_DIRECTORIES =
  new Set([
    '.git',
    'node_modules',
    'target',
    'dist',
    'build',
    'data',
    '.cache'
  ]);

const DEFAULT_BINARY_EXTENSIONS =
  new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.pdf',
    '.zip',
    '.gz',
    '.tar',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.bin',
    '.hex',
    '.elf'
  ]);

const DEFAULT_PATTERNS = [
  {
    code:
      'PRIVATE_KEY',
    expression:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g
  },
  {
    code:
      'GITHUB_TOKEN',
    expression:
      /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/g
  },
  {
    code:
      'GITHUB_FINE_GRAINED_TOKEN',
    expression:
      /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g
  },
  {
    code:
      'OPENAI_API_KEY',
    expression:
      /\bsk-[A-Za-z0-9_-]{32,}\b/g
  },
  {
    code:
      'AWS_ACCESS_KEY',
    expression:
      /\bAKIA[A-Z0-9]{16}\b/g
  },
  {
    code:
      'ARDUINO_LED_API_TOKEN',
    expression:
      /\balc2_[A-Za-z0-9_-]{24,}\b/g
  },
  {
    code:
      'ENV_SECRET_ASSIGNMENT',
    expression:
      /^(?:API_V2_TOKEN|OTA_PASSWORD|SESSION_SECRET|ADMIN_PASSWORD)\s*=\s*(?!$|change-me|example|placeholder|<[^>]+>)([^\s#][^\r\n]*)$/gmi
  }
];

function readAllowlist(
  filePath
) {
  if (!filePath) {
    return {
      ignoredFiles: [],
      ignoredCodes: [],
      ignoredValueHashes: []
    };
  }

  const parsed =
    JSON.parse(
      fs.readFileSync(
        filePath,
        'utf8'
      )
    );

  return {
    ignoredFiles:
      Array.isArray(
        parsed.ignoredFiles
      )
        ? parsed.ignoredFiles
            .map(String)
        : [],
    ignoredCodes:
      Array.isArray(
        parsed.ignoredCodes
      )
        ? parsed.ignoredCodes
            .map(String)
        : [],
    ignoredValueHashes:
      Array.isArray(
        parsed.ignoredValueHashes
      )
        ? parsed
            .ignoredValueHashes
            .map(String)
        : []
  };
}

function normalizedPath(
  value
) {
  return String(value)
    .replace(/\\/g, '/');
}

function pathMatches(
  file,
  pattern
) {
  const normalizedFile =
    normalizedPath(file);

  const normalizedPattern =
    normalizedPath(pattern);

  if (
    normalizedPattern.endsWith(
      '/**'
    )
  ) {
    return normalizedFile
      .startsWith(
        normalizedPattern
          .slice(0, -3)
      );
  }

  if (
    normalizedPattern.startsWith(
      '**/'
    )
  ) {
    return normalizedFile
      .endsWith(
        normalizedPattern
          .slice(3)
      );
  }

  return normalizedFile ===
    normalizedPattern;
}

function valueHash(
  value
) {
  return crypto
    .createHash('sha256')
    .update(
      String(value)
    )
    .digest('hex');
}

function walkTextFiles(
  root,
  {
    excludedDirectories =
      DEFAULT_EXCLUDED_DIRECTORIES,
    binaryExtensions =
      DEFAULT_BINARY_EXTENSIONS
  } = {}
) {
  const results = [];

  function walk(
    directory
  ) {
    for (
      const entry
      of fs.readdirSync(
        directory,
        {
          withFileTypes: true
        }
      )
    ) {
      const absolute =
        path.join(
          directory,
          entry.name
        );

      if (
        entry.isDirectory()
      ) {
        if (
          excludedDirectories
            .has(entry.name)
        ) {
          continue;
        }

        walk(absolute);
        continue;
      }

      if (
        !entry.isFile()
      ) {
        continue;
      }

      if (
        binaryExtensions.has(
          path.extname(
            entry.name
          ).toLowerCase()
        )
      ) {
        continue;
      }

      const stats =
        fs.statSync(
          absolute
        );

      if (
        stats.size >
        2 * 1024 * 1024
      ) {
        continue;
      }

      results.push(
        absolute
      );
    }
  }

  walk(
    path.resolve(root)
  );

  return results.sort();
}

function scanReleaseTree({
  root,
  allowlistFile = null,
  patterns =
    DEFAULT_PATTERNS
}) {
  const absoluteRoot =
    path.resolve(root);

  const allowlist =
    readAllowlist(
      allowlistFile
    );

  const findings = [];

  for (
    const filePath
    of walkTextFiles(
      absoluteRoot
    )
  ) {
    const relative =
      normalizedPath(
        path.relative(
          absoluteRoot,
          filePath
        )
      );

    if (
      allowlist
        .ignoredFiles
        .some(
          (pattern) =>
            pathMatches(
              relative,
              pattern
            )
        )
    ) {
      continue;
    }

    const text =
      fs.readFileSync(
        filePath,
        'utf8'
      );

    for (
      const pattern
      of patterns
    ) {
      if (
        allowlist
          .ignoredCodes
          .includes(
            pattern.code
          )
      ) {
        continue;
      }

      pattern.expression
        .lastIndex = 0;

      let match;

      while (
        (
          match =
            pattern.expression
              .exec(text)
        )
      ) {
        const secret =
          match[1] ||
          match[0];

        const digest =
          valueHash(secret);

        if (
          allowlist
            .ignoredValueHashes
            .includes(digest)
        ) {
          continue;
        }

        const before =
          text.slice(
            0,
            match.index
          );

        findings.push({
          code:
            pattern.code,
          file:
            relative,
          line:
            before
              .split(/\r?\n/)
              .length,
          valueSha256:
            digest,
          valueLength:
            String(secret)
              .length
        });

        if (
          match[0].length === 0
        ) {
          pattern.expression
            .lastIndex += 1;
        }
      }
    }
  }

  return {
    schemaVersion: 1,
    scanner:
      'arduino-led-controller-release-secret-scanner',
    root:
      path.basename(
        absoluteRoot
      ),
    scannedFiles:
      walkTextFiles(
        absoluteRoot
      ).length,
    passed:
      findings.length === 0,
    findings
  };
}

module.exports = {
  DEFAULT_PATTERNS,
  pathMatches,
  readAllowlist,
  scanReleaseTree,
  valueHash,
  walkTextFiles
};
