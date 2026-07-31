'use strict';
const assert=require('assert');const fs=require('fs');
const api=JSON.parse(fs.readFileSync('docs/api/arduino-direct-api-v1.json','utf8'));
assert.strictEqual(api.info.version,'1.0.0');assert.strictEqual(api.components.securitySchemes.DeviceKey.name,'X-Device-Key');
for(const p of ['/api/v1/leds/{ledId}','/api/v1/schedules/transactions','/api/v1/schedules/transactions/{transactionId}/commit'])assert.ok(api.paths[p],p);
console.log('OK: final Direct API v1 OpenAPI');
