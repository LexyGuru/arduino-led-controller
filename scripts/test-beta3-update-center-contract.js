"use strict";
const versionSsot=require('./lib/version-ssot');
const assert=require("node:assert/strict"),fs=require("node:fs");
(async()=>{
 const u=await import("../desktop-tauri/src/utils/updateVersion.mjs");
 assert.ok(u.compareReleaseVersions("5.0.0-beta.10","5.0.0-beta.9")>0);
 assert.equal(u.getUpdateRelation("5.0.0-beta.8","5.0.0-beta.9"),"older");
 assert.equal(u.getUpdateRelation("5.0.0-beta.9","5.0.0-beta.9"),"same");

 const c=fs.readFileSync("desktop-tauri/src/components/v55/UpdateCenterPanel.tsx","utf8");
 const n=c.replace(/\s+/g,"");
 assert.ok(n.includes("updateCenterModel.readiness.arduino"));
 assert.ok(n.includes("updateCenterModel.readiness.ota"));
 assert.ok(n.includes("updateCenterModel.readiness.backup"))
assert.ok(n.includes("buildUpdateCenterPanelModel({firmware})"))
assert.ok(n.includes("updateCenterModel.application.relation"))
assert.ok(n.includes("updateCenterModel.firmware.relation"))
assert.ok(n.includes("updateCenterModel.firmware.canInstall"))
assert.ok(n.includes("!busy&&updateCenterModel.firmware.canInstall"));
 assert.ok(n.includes("firmwareRelation==='newer'"));
 assert.ok(c.includes("beta3-readiness-line"));
 assert.ok(!c.includes("beta3-readiness-pills"));
 assert.ok(!c.includes("beta3-up-to-date"));

 const p=fs.readFileSync("desktop-tauri/src/pages/FirmwarePage.tsx","utf8");
 assert.ok(p.includes("<UpdateCenterPanel"));
 assert.ok(p.includes("beta3-firmware-support-grid"));
 assert.ok(!p.includes('className="stats-grid v55-firmware-stats"'));
 assert.ok(p.includes("firmware.statusTitle"));
 assert.ok(p.includes("firmware-status-summary"));
 assert.ok(p.includes("v5-firmware-catalog-scroll"));
 assert.ok(p.includes("firmware.catalogScrollLabel"));

 const css=fs.readFileSync("desktop-tauri/src/v551-beta3-update-center.css","utf8");
 assert.ok(/max-height\s*:\s*min\(\s*58vh\s*,\s*560px\s*\)/.test(css));
 assert.ok(/overflow-y\s*:\s*auto/.test(css));
 assert.ok(/overscroll-behavior\s*:\s*contain/.test(css));
 assert.ok(/scrollbar-gutter\s*:\s*stable/.test(css));

 const i=fs.readFileSync("scripts/fixtures/i18n-embedded-en-compat-v800.txt","utf8");
 for(const k of ["firmware.statusTitle","firmware.catalogScrollLabel","beta3.update.readinessShort.arduino","beta3.update.readinessShort.ota","beta3.update.readinessShort.backup"]){
   assert.equal(i.split(JSON.stringify(k)).length-1,3,k);
 }

 const rv=JSON.parse(fs.readFileSync("release-versions.json","utf8"));
 assert.equal(fs.readFileSync("VERSION","utf8").trim(),"5.5.1-beta.4");
 assert.equal(rv.firmware,versionSsot.firmware);
 assert.equal(rv.directApi,versionSsot.directApi);

 console.log("BETA3_OTA2_READINESS_MINIMAL_LINE=PASSED");
 console.log("BETA3_DUPLICATE_UP_TO_DATE=REMOVED");
 console.log("BETA3_FIRMWARE_STATUS_NEUTRAL_HEADING=PASSED");
 console.log("BETA3_FIRMWARE_CATALOG_BOUNDED_SCROLL=PASSED");
 console.log("BETA3_UPDATE_CENTER_I18N_HU_EN_DE=PASSED");
 console.log("BETA3_TEST_POLICY=SEMANTIC_WHITESPACE_INDEPENDENT");
})().catch(e=>{console.error(e);process.exit(1)});
