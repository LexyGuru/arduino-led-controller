import {
  classifyFirmwareRelation,
  deriveFirmwareAction,
} from "./updateCenterCore.mjs";

function text(value) {
  return String(value ?? "").trim();
}

export function buildUpdateCenterPanelModel({
  application = null,
  firmware = null,
} = {}) {
  const installedApplication = text(
    application?.installedVersion ??
    firmware?.appCurrentVersion,
  );
  const availableApplication = text(
    application?.availableVersion ??
    firmware?.availableApp?.version ??
    firmware?.availableApp?.tag,
  );
  const installedFirmware = text(firmware?.installedVersion);
  const availableFirmware = text(
    firmware?.availableFirmware?.firmwareVersion ??
    firmware?.availableFirmware?.version ??
    firmware?.availableFirmware?.tag,
  );

  const applicationRelation =
    installedApplication && availableApplication
      ? classifyFirmwareRelation(installedApplication, availableApplication)
      : "unknown";
  const firmwareRelation =
    classifyFirmwareRelation(installedFirmware, availableFirmware);

  const readiness = Object.freeze({
    arduino: firmware?.arduinoOnline === true,
    ota: firmware?.otaConfigured === true,
    backup: firmware?.backupStoreConfigured === true,
  });

  const firmwareAction = deriveFirmwareAction({
    installedVersion: installedFirmware,
    availableVersion: availableFirmware,
  });

  return Object.freeze({
    application: Object.freeze({
      installedVersion: installedApplication || null,
      availableVersion: availableApplication || null,
      relation: applicationRelation,
    }),
    firmware: Object.freeze({
      installedVersion: installedFirmware || null,
      availableVersion: availableFirmware || null,
      relation: firmwareRelation,
      action: firmwareAction,
      canInstall:
        firmwareAction === "update" &&
        readiness.arduino &&
        readiness.ota &&
        readiness.backup,
    }),
    readiness,
  });
}
