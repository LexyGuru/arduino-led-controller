'use strict';

const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEVICE_KEY = 'alpha3-device-key-test-secret-1234567890';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

async function testModularClient() {
  const requests = [];
  const fakeAxios = async (request) => {
    requests.push(request);
    return {
      status: 200,
      data: {
        success: true
      }
    };
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'axios') return fakeAxios;
    return originalLoad.call(this, request, parent, isMain);
  };

  let ArduinoClient;
  try {
    const modulePath = require.resolve('../server/arduino/arduino-client');
    delete require.cache[modulePath];
    ({ ArduinoClient } = require(modulePath));
  } finally {
    Module._load = originalLoad;
  }

  const client = new ArduinoClient({
    config: {
      ip: '127.0.0.1',
      port: 8080,
      apiPath: '/alpha3-private-api-path',
      apiKey: DEVICE_KEY,
      timeoutMs: 5000,
      healthTimeoutMs: 500
    },
    transport: fakeAxios
  });

  const url = client.buildUrl('api/status', {
    verbose: 1
  });

  assert.strictEqual(url.pathname, '/alpha3-private-api-path/api/status');
  assert.strictEqual(url.searchParams.get('verbose'), '1');
  assert.strictEqual(url.searchParams.has('k'), false);
  assert.strictEqual(url.toString().includes(DEVICE_KEY), false);

  await client.get('api/status', {
    headers: {
      'X-Device-Key': 'caller-cannot-override-this',
      'x-device-key': 'lowercase-caller-cannot-override-this'
    },
    source: 'alpha3-test'
  });

  assert.strictEqual(requests.length, 1);
  assert.strictEqual(requests[0].headers['X-Device-Key'], DEVICE_KEY);
  assert.strictEqual(
    Object.keys(requests[0].headers)
      .filter((name) => name.toLowerCase() === 'x-device-key')
      .length,
    1
  );
  assert.strictEqual(requests[0].headers['X-Request-Source'], 'alpha3-test');
  assert.strictEqual(requests[0].url.includes(DEVICE_KEY), false);
  assert.strictEqual(/[?&]k=/.test(requests[0].url), false);
}

function testFirmwareContract() {
  const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');
  const secretsExample = read('firmware/ArduinoLedController/secrets.example.h');

  assert.match(firmware, /#define FIRMWARE_VERSION "4\.1\.21"/);
  assert.match(firmware, /#define FIRMWARE_FEATURE "device-key-header-4\.1\.21"/);
  assert.match(firmware, /#define API_DEVICE_KEY_HEADER "X-Device-Key"/);
  assert.match(firmware, /#define API_ALLOW_QUERY_KEY_FALLBACK 1/);
  assert.match(firmware, /name\.equalsIgnoreCase\(API_DEVICE_KEY_HEADER\)/);
  assert.match(firmware, /authenticateDeviceRequest\(/);
  assert.match(firmware, /if \(headerDeviceKeyPresent\)/);
  assert.match(firmware, /#if API_ALLOW_QUERY_KEY_FALLBACK/);
  assert.match(firmware, /httpHeaderAuthAccepted\+\+/);
  assert.match(firmware, /httpQueryFallbackAccepted\+\+/);
  assert.match(firmware, /deviceKeyHeaderAccepted/);
  assert.match(firmware, /queryKeyFallbackEnabled/);
  assert.match(firmware, /if \(!item\.startsWith\("k="\)\)/);
  assert.match(firmware, /code == 401 \? "401 Unauthorized"/);
  assert.match(firmware, /code == 408 \? "408 Request Timeout"/);
  assert.match(firmware, /Ervenytelen vagy hianyzo eszkozazonosito kulcs/);
  assert.match(firmware, /Ervenytelen vagy tobbszoros X-Device-Key fejlec/);
  assert.match(firmware, /HTTP fejlec olvasasi idotullepes/);
  assert.match(firmware, /HTTP_WRITE_CHUNK_SIZE = 512/);
  assert.match(firmware, /HTTP_RESPONSE_SETTLE_DELAY_MS = 150/);
  assert.match(firmware, /WIFI_LINK_PROBE_INTERVAL_MS = 15000/);
  assert.match(firmware, /WIFI_RSSI_REFRESH_INTERVAL_MS = 30000/);
  assert.match(firmware, /NTP_UNSYNCED_RETRY_INTERVAL_MS = 5000/);
  assert.match(firmware, /void refreshWifiTelemetry\(bool force = false\)/);
  assert.match(firmware, /cachedWifiConnected/);
  assert.match(firmware, /cachedWifiIp/);
  assert.match(firmware, /cachedWifiRssi/);
  assert.match(firmware, /uint8_t firstChunk\[HTTP_WRITE_CHUNK_SIZE\]/);
  assert.match(
    firmware,
    /memcpy\(firstChunk, header, headerBytes\);[\s\S]*firstBodyBytes[\s\S]*writeClientChunk\(client, firstChunk, headerBytes \+ firstBodyBytes\)[\s\S]*while \(offset < bodyLength\)[\s\S]*chunkLength[\s\S]*delay\(HTTP_RESPONSE_SETTLE_DELAY_MS\);[\s\S]*return true;/
  );
  assert.doesNotMatch(firmware, /HTTP_RESPONSE_BUFFER_SIZE/);
  assert.doesNotMatch(firmware, /httpResponseBuffer/);
  assert.doesNotMatch(firmware, /client\.flush\(\)/);
  assert.match(firmware, /if \(!pollingRequest && !timedOut\)/);
  assert.match(firmware, /const IPAddress remote = c\.remoteIP\(\)/);
  assert.match(firmware, /const IPAddress currentIp = cachedWifiIp/);
  assert.match(firmware, /cachedWifiConnected \? cachedWifiRssi : 0/);
  assert.match(firmware, /if \(!otaTransferActive\) handleHttp\(\);[\s\S]*refreshWifiTelemetry\(false\);/);
  assert.match(
    firmware,
    /sendJsonLiteral\(c, .*eszkozazonosito kulcs.*401\)/
  );
  assert.match(
    firmware,
    /sendJsonLiteral\(c, .*X-Device-Key fejlec.*400\)/
  );
  assert.match(
    firmware,
    /sendJsonLiteral\(c, .*idotullepes.*408\)/
  );
  assert.doesNotMatch(
    firmware,
    /constantTimeEquals\(supplied, apiSettings\.sharedSecret\).*return false;\s*apiPath/s
  );

  assert.match(secretsExample, /API_ALLOW_QUERY_KEY_FALLBACK 1/);
}

function testLegacyClientContract() {
  const legacy = read('server2_legacy.js');

  assert.match(legacy, /'X-Device-Key': this\.apiKey/);
  assert.match(legacy, /`X-Device-Key: \$\{this\.apiKey\}`/);
  assert.match(legacy, /'--header', '@-'/);
  assert.match(legacy, /spawnWithInput\('\/usr\/bin\/curl'/);
  assert.doesNotMatch(legacy, /'--header', `X-Device-Key:/);
  assert.match(legacy, /return `\$\{this\.apiPath\}\$\{endpoint\}`/);
  assert.doesNotMatch(legacy, /separator}k=/);
  assert.doesNotMatch(legacy, /encodeURIComponent\(this\.apiKey\)/);
}

function testTauriContract() {
  const rust = read('desktop-tauri/src-tauri/src/lib.rs');

  assert.match(rust, /fn device_key_header_value\(/);
  assert.match(rust, /X-Device-Key: \{device_key\}/);
  assert.match(rust, /Ok\(format!\("\{prefix\}\{path\}"\)\)/);
  assert.doesNotMatch(rust, /\?k=/);
  assert.doesNotMatch(rust, /\{sep\}k=/);
  assert.doesNotMatch(rust, /fn percent_encode\(/);
  assert.match(rust, /0x21\.\.=0x7e/);
}

function testFirmwareWorkflowContract() {
  const workflow = read('.github/workflows/firmware-build.yml');

  assert.match(workflow, /Verify Alpha\.3 device-key contract/);
  assert.match(workflow, /node scripts\/test-alpha3-device-key-header\.js/);
  assert.match(
    workflow,
    /Publish latest public firmware release[\s\S]*if: github\.ref == 'refs\/heads\/main'/
  );
}

function testNoClientQuerySecret() {
  const clientFiles = [
    'server/arduino/arduino-client.js',
    'server2_legacy.js',
    'desktop-tauri/src-tauri/src/lib.rs'
  ];

  for (const file of clientFiles) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /(?:searchParams\.set\(\s*['"]k['"]|[?&]k=|\{sep\}k=|separator}k=)/,
      `${file}: az Arduino API-kulcs nem kerülhet query-paraméterbe.`
    );
  }
}

async function main() {
  await testModularClient();
  testFirmwareContract();
  testLegacyClientContract();
  testTauriContract();
  testFirmwareWorkflowContract();
  testNoClientQuerySecret();

  console.log('OK: moduláris Node kliens X-Device-Key fejlécet küld');
  console.log('OK: legacy Node és macOS curl transport fejlécet küld');
  console.log('OK: Tauri közvetlen Arduino kliens fejlécet küld');
  console.log('OK: firmware header-first auth, 512 bájtos válaszok és gyorsítótárazott WiFi-telemetria');
  console.log('OK: feature ág firmware buildje nem írja felül a public firmware-latest release-t');
  console.log('OK: kliensoldali URL-ek nem tartalmaznak Arduino API-kulcsot');
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
