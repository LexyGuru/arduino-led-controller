'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const module = await import(
    '../desktop-tauri/src/api/runtime/ota-tool-config.mjs'
  );

  const lib = fs.readFileSync(
    'desktop-tauri/src-tauri/src/lib.rs',
    'utf8',
  );

  assert.equal(
    module.otaToolCandidates({
      platform: 'macos',
      arch: 'arm64',
    })[0].path,
    '/usr/local/bin/arduinoOTA',
  );

  assert.deepEqual(
    module.resolveOtaTool(
      {
        localHost: '10.0.0.117',
        privateApiPath: '/private',
        otaToolMode: 'custom',
        otaToolPath: '/custom/arduinoOTA',
      },
      [],
    ),
    {
      source: 'custom',
      path: '/custom/arduinoOTA',
    },
  );

  assert.match(
    lib,
    /TOOL_HELP="\$\("\$TOOL" -h 2>&1 \|\| true\)"/,
  );
  assert.match(
    lib,
    /nem támogat igazolható -t timeout kapcsolót/,
  );
  assert.match(
    lib,
    /TIMEOUT_ARGS=\(-t "\$TIMEOUT_SECONDS"\)/,
  );
  assert.match(
    lib,
    /Külső arduinoOTA timeout: \$TIMEOUT_SECONDS másodperc/,
  );
  assert.doesNotMatch(
    lib,
    /TIMEOUT_ARGS=\(-t 90\)/,
  );
  assert.doesNotMatch(
    lib,
    /Ok\(find_ota_tool\(app, config\)\.is_some\(\)\)/,
  );

  assert.match(
    lib,
    /macOS-en az UNO R4 OTA-frissítéshez/,
  );
  assert.match(
    lib,
    /return Ok\(true\);/,
  );
  assert.match(
    lib,
    /matches!\(mode\.trim\(\), "auto" \| "system" \| "custom" \| "bundled"\)/,
  );

  console.log(
    'OK: macOS UNO R4 helyi arduinoOTA detektálás, Terminal kényszerítés és timeout capability gate',
  );
})();
