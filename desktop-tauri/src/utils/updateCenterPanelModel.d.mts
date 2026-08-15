export function buildUpdateCenterPanelModel(input?: {
  application?: unknown;
  firmware?: unknown;
}): {
  application: Readonly<{
    installedVersion: string | null;
    availableVersion: string | null;
    relation: "newer" | "same" | "older" | "unknown";
  }>;
  firmware: Readonly<{
    installedVersion: string | null;
    availableVersion: string | null;
    relation: "newer" | "same" | "older" | "unknown";
    action: "update" | "current" | "restore" | "unknown";
    canInstall: boolean;
  }>;
  readiness: Readonly<{ arduino: boolean; ota: boolean; backup: boolean }>;
};
