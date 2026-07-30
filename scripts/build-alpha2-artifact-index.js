#!/usr/bin/env node
'use strict';

const fs =
  require('fs');

const path =
  require('path');

const {
  sha256File,
  writeJsonAtomic
} =
  require(
    '../server/release/release-execution-receipt'
  );

function argument(
  name,
  fallback = ''
) {
  const index =
    process.argv
      .indexOf(name);

  return index >= 0
    ? process.argv[
        index + 1
      ]
    : fallback;
}

function walk(
  directory
) {
  const files = [];

  if (
    !fs.existsSync(
      directory
    )
  ) {
    return files;
  }

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
      files.push(
        ...walk(absolute)
      );
    } else if (
      entry.isFile()
    ) {
      files.push(
        absolute
      );
    }
  }

  return files;
}

function main() {
  const directory =
    path.resolve(
      argument(
        '--directory'
      ) ||
      ''
    );

  const output =
    path.resolve(
      argument(
        '--output',
        path.join(
          directory,
          'index.json'
        )
      )
    );

  if (!directory) {
    throw new Error(
      'A --directory kötelező.'
    );
  }

  const entries =
    walk(directory)
      .filter(
        (file) =>
          path.resolve(file) !==
          output
      )
      .map(
        (file) => {
          const stats =
            fs.statSync(file);

          return {
            path:
              path
                .relative(
                  directory,
                  file
                )
                .replace(
                  /\\/g,
                  '/'
                ),
            bytes:
              stats.size,
            sha256:
              sha256File(file),
            modifiedAt:
              stats
                .mtime
                .toISOString()
          };
        }
      )
      .sort(
        (left, right) =>
          left.path
            .localeCompare(
              right.path
            )
      );

  const index = {
    schemaVersion: 1,
    directory:
      path.basename(
        directory
      ),
    generatedAt:
      new Date()
        .toISOString(),
    files:
      entries
  };

  writeJsonAtomic(
    output,
    index,
    0o644
  );

  console.log(
    `Artifact index: ${output}`
  );

  console.log(
    `Fájlok: ${entries.length}`
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
