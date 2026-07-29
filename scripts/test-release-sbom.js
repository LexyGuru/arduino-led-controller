'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

const path =
  require('path');

const {
  buildReleaseSbom,
  parseCargoLock
} =
  require(
    '../server/release/release-sbom'
  );

function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'release-sbom-'
      )
    );

  try {
    fs.mkdirSync(
      path.join(
        root,
        'desktop-tauri',
        'src-tauri'
      ),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      path.join(
        root,
        'package.json'
      ),
      JSON.stringify({
        name:
          'arduino-led-controller',
        version:
          '5.0.0-alpha.1'
      })
    );

    fs.writeFileSync(
      path.join(
        root,
        'package-lock.json'
      ),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': {
            name:
              'arduino-led-controller',
            version:
              '5.0.0-alpha.1'
          },
          'node_modules/express': {
            name:
              'express',
            version:
              '4.21.2',
            license:
              'MIT'
          }
        }
      })
    );

    fs.writeFileSync(
      path.join(
        root,
        'desktop-tauri',
        'src-tauri',
        'Cargo.lock'
      ),
      `version = 4

[[package]]
name = "keyring"
version = "4.1.5"
source = "registry+https://github.com/rust-lang/crates.io-index"

[[package]]
name = "zeroize"
version = "1.9.0"
`
    );

    const sbom =
      buildReleaseSbom({
        root,
        version:
          '5.0.0-alpha.1',
        commit:
          'a'.repeat(40),
        generatedAt:
          '2026-07-29T10:00:00.000Z'
      });

    assert.strictEqual(
      sbom.bomFormat,
      'CycloneDX'
    );

    assert.strictEqual(
      sbom.specVersion,
      '1.5'
    );

    assert.strictEqual(
      sbom.components.length,
      3
    );

    assert.strictEqual(
      sbom.components.some(
        (component) =>
          component.purl ===
          'pkg:npm/express@4.21.2'
      ),
      true
    );

    assert.strictEqual(
      sbom.components.some(
        (component) =>
          component.purl ===
          'pkg:cargo/keyring@4.1.5'
      ),
      true
    );

    assert.strictEqual(
      parseCargoLock(
        fs.readFileSync(
          path.join(
            root,
            'desktop-tauri',
            'src-tauri',
            'Cargo.lock'
          ),
          'utf8'
        )
      ).length,
      2
    );

    console.log(
      'OK: CycloneDX 1.5 npm és Cargo SBOM'
    );

    console.log(
      'OK: stabil és egyedi komponenslista'
    );
  } finally {
    fs.rmSync(
      root,
      {
        recursive: true,
        force: true
      }
    );
  }
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
