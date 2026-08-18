export const OTA2_ARTIFACT_CODES: Readonly<Record<string, string>>;
export function normalizeSha256(value: unknown): string | null;
export function parseSha256Checksum(text: unknown, expectedFileName?: string): string | null;
export function resolveExpectedSha256(input?: {
  checksumUrl?: unknown;
  expectedFileName?: string;
  fetchImpl?: typeof fetch;
}): Promise<Readonly<Record<string, unknown>>>;
export function sha256Hex(bytes: Uint8Array | ArrayBuffer, cryptoImpl?: Crypto): Promise<string>;
export function verifyFirmwareBytes(input?: {
  bytes?: Uint8Array | ArrayBuffer;
  expectedSha256?: unknown;
  cryptoImpl?: Crypto;
}): Promise<Readonly<Record<string, unknown>>>;
export function downloadAndVerifyFirmware(input?: {
  downloadUrl?: unknown;
  expectedSha256?: unknown;
  fetchImpl?: typeof fetch;
  cryptoImpl?: Crypto;
}): Promise<Readonly<Record<string, unknown>>>;
