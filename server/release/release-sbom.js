'use strict';

const fs =
  require('fs');

const path =
  require('path');

function readJson(
  filePath
) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8'
    )
  );
}

function normalizeLicense(
  value
) {
  if (
    typeof value ===
      'string' &&
    value.trim()
  ) {
    return [
      {
        license: {
          id:
            value.trim()
        }
      }
    ];
  }

  return undefined;
}

function npmComponents(
  lock
) {
  const components =
    [];

  const packages =
    lock?.packages &&
    typeof lock.packages ===
      'object'
      ? lock.packages
      : {};

  for (
    const [
      packagePath,
      metadata
    ]
    of Object.entries(
      packages
    )
  ) {
    if (
      !packagePath ||
      !packagePath.startsWith(
        'node_modules/'
      )
    ) {
      continue;
    }

    const name =
      metadata.name ||
      packagePath
        .slice(
          'node_modules/'
            .length
        );

    const version =
      String(
        metadata.version ||
        ''
      ).trim();

    if (
      !name ||
      !version
    ) {
      continue;
    }

    const component = {
      type:
        'library',
      group:
        '',
      name,
      version,
      purl:
        `pkg:npm/${encodeURIComponent(
          name
        )}@${encodeURIComponent(
          version
        )}`,
      properties: [
        {
          name:
            'arduino-led-controller:ecosystem',
          value:
            'npm'
        }
      ]
    };

    const licenses =
      normalizeLicense(
        metadata.license
      );

    if (licenses) {
      component.licenses =
        licenses;
    }

    components.push(
      component
    );
  }

  return components;
}

function parseCargoLock(
  text
) {
  const packages =
    [];

  let current =
    null;

  for (
    const line
    of String(text || '')
      .split(/\r?\n/)
  ) {
    if (
      line.trim() ===
      '[[package]]'
    ) {
      if (
        current?.name &&
        current?.version
      ) {
        packages.push(
          current
        );
      }

      current = {};
      continue;
    }

    if (!current) {
      continue;
    }

    const match =
      line.match(
        /^(name|version|source)\s*=\s*"([^"]*)"\s*$/
      );

    if (match) {
      current[
        match[1]
      ] =
        match[2];
    }
  }

  if (
    current?.name &&
    current?.version
  ) {
    packages.push(
      current
    );
  }

  return packages;
}

function cargoComponents(
  text
) {
  return parseCargoLock(
    text
  ).map(
    (metadata) => ({
      type:
        'library',
      group:
        '',
      name:
        metadata.name,
      version:
        metadata.version,
      purl:
        `pkg:cargo/${encodeURIComponent(
          metadata.name
        )}@${encodeURIComponent(
          metadata.version
        )}`,
      properties: [
        {
          name:
            'arduino-led-controller:ecosystem',
          value:
            'cargo'
        },
        {
          name:
            'arduino-led-controller:source',
          value:
            metadata.source ||
            'local-or-workspace'
        }
      ]
    })
  );
}

function componentKey(
  component
) {
  return [
    component.type,
    component.purl ||
    component.name,
    component.version
  ].join('|');
}

function uniqueComponents(
  components
) {
  const unique =
    new Map();

  for (
    const component
    of components
  ) {
    unique.set(
      componentKey(
        component
      ),
      component
    );
  }

  return [
    ...unique.values()
  ].sort(
    (left, right) =>
      componentKey(left)
        .localeCompare(
          componentKey(right)
        )
  );
}

function buildReleaseSbom({
  root,
  version,
  commit,
  generatedAt =
    new Date()
      .toISOString()
}) {
  const packagePath =
    path.join(
      root,
      'package.json'
    );

  const packageLockPath =
    path.join(
      root,
      'package-lock.json'
    );

  const cargoLockPath =
    path.join(
      root,
      'desktop-tauri',
      'src-tauri',
      'Cargo.lock'
    );

  const packageData =
    readJson(
      packagePath
    );

  const packageLock =
    readJson(
      packageLockPath
    );

  const cargoLock =
    fs.readFileSync(
      cargoLockPath,
      'utf8'
    );

  const resolvedVersion =
    String(
      version ||
      packageData.version ||
      ''
    ).trim();

  if (!resolvedVersion) {
    throw new TypeError(
      'Az SBOM-hoz projektverzió szükséges.'
    );
  }

  const components =
    uniqueComponents([
      ...npmComponents(
        packageLock
      ),
      ...cargoComponents(
        cargoLock
      )
    ]);

  return {
    bomFormat:
      'CycloneDX',
    specVersion:
      '1.5',
    serialNumber:
      `urn:uuid:${cryptoUuid(
        [
          packageData.name,
          resolvedVersion,
          commit
        ].join(':')
      )}`,
    version: 1,
    metadata: {
      timestamp:
        generatedAt,
      component: {
        type:
          'application',
        name:
          packageData.name ||
          'arduino-led-controller',
        version:
          resolvedVersion,
        properties: [
          {
            name:
              'arduino-led-controller:git-commit',
            value:
              String(
                commit ||
                'unknown'
              )
          }
        ]
      },
      tools: {
        components: [
          {
            type:
              'application',
            name:
              'arduino-led-controller-release-sbom',
            version:
              '1'
          }
        ]
      }
    },
    components
  };
}

function cryptoUuid(
  value
) {
  const crypto =
    require('crypto');

  const digest =
    crypto
      .createHash(
        'sha256'
      )
      .update(
        String(value)
      )
      .digest('hex');

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `4${digest.slice(
      13,
      16
    )}`,
    `8${digest.slice(
      17,
      20
    )}`,
    digest.slice(20, 32)
  ].join('-');
}

module.exports = {
  buildReleaseSbom,
  cargoComponents,
  npmComponents,
  parseCargoLock,
  uniqueComponents
};
