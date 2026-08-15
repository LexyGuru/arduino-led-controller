const SHA256_HEX = /^[0-9a-f]{64}$/i;

export const OTA2_ARTIFACT_CODES = Object.freeze({
  READY: "X5200",
  CHECKSUM_URL_MISSING: "X5201",
  CHECKSUM_FETCH_FAILED: "X5202",
  CHECKSUM_PARSE_FAILED: "X5203",
  DOWNLOAD_URL_MISSING: "X5204",
  BINARY_FETCH_FAILED: "X5205",
  BINARY_EMPTY: "X5206",
  BINARY_SHA_MISMATCH: "X5207",
  CRYPTO_UNAVAILABLE: "X5208",
});

export function normalizeSha256(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return SHA256_HEX.test(text) ? text : null;
}

export function parseSha256Checksum(text, expectedFileName = "") {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  const plain = normalizeSha256(raw);
  if (plain) return plain;

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const preferredName = String(expectedFileName ?? "").trim();

  for (const line of lines) {
    const openssl = line.match(/^SHA256\s*\((.+)\)\s*=\s*([0-9a-f]{64})$/i);
    if (openssl) {
      if (!preferredName || openssl[1] === preferredName) {
        return openssl[2].toLowerCase();
      }
    }

    const common = line.match(/^([0-9a-f]{64})\s+\*?(.+)?$/i);
    if (common) {
      const file = String(common[2] ?? "").trim();
      if (!preferredName || !file || file === preferredName) {
        return common[1].toLowerCase();
      }
    }
  }

  return null;
}

export async function resolveExpectedSha256({
  checksumUrl,
  expectedFileName = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!String(checksumUrl ?? "").trim()) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.CHECKSUM_URL_MISSING,
      sha256: null,
    });
  }
  if (typeof fetchImpl !== "function") {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.CHECKSUM_FETCH_FAILED,
      sha256: null,
    });
  }

  try {
    const response = await fetchImpl(checksumUrl);
    if (!response?.ok) {
      return Object.freeze({
        ok: false,
        code: OTA2_ARTIFACT_CODES.CHECKSUM_FETCH_FAILED,
        sha256: null,
        status: response?.status ?? null,
      });
    }
    const text = await response.text();
    const sha256 = parseSha256Checksum(text, expectedFileName);
    if (!sha256) {
      return Object.freeze({
        ok: false,
        code: OTA2_ARTIFACT_CODES.CHECKSUM_PARSE_FAILED,
        sha256: null,
      });
    }
    return Object.freeze({
      ok: true,
      code: OTA2_ARTIFACT_CODES.READY,
      sha256,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.CHECKSUM_FETCH_FAILED,
      sha256: null,
      error: String(error),
    });
  }
}

function bytesToHex(bytes) {
  return Array.from(bytes, (item) => item.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(bytes, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle?.digest) {
    throw Object.assign(
      new Error("OTA2 SHA-256 crypto unavailable"),
      { code: OTA2_ARTIFACT_CODES.CRYPTO_UNAVAILABLE },
    );
  }
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes);
  const digest = await cryptoImpl.subtle.digest(
    "SHA-256",
    view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
  );
  return bytesToHex(new Uint8Array(digest));
}

export async function verifyFirmwareBytes({
  bytes,
  expectedSha256,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const expected = normalizeSha256(expectedSha256);
  const view =
    bytes instanceof Uint8Array
      ? bytes
      : bytes
        ? new Uint8Array(bytes)
        : new Uint8Array();

  if (view.byteLength === 0) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.BINARY_EMPTY,
      actualSha256: null,
      expectedSha256: expected,
    });
  }
  if (!expected) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.CHECKSUM_PARSE_FAILED,
      actualSha256: null,
      expectedSha256: null,
    });
  }

  try {
    const actualSha256 = await sha256Hex(view, cryptoImpl);
    return Object.freeze({
      ok: actualSha256 === expected,
      code:
        actualSha256 === expected
          ? OTA2_ARTIFACT_CODES.READY
          : OTA2_ARTIFACT_CODES.BINARY_SHA_MISMATCH,
      actualSha256,
      expectedSha256: expected,
      byteLength: view.byteLength,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      code:
        error?.code ??
        OTA2_ARTIFACT_CODES.CRYPTO_UNAVAILABLE,
      actualSha256: null,
      expectedSha256: expected,
      error: String(error),
    });
  }
}

export async function downloadAndVerifyFirmware({
  downloadUrl,
  expectedSha256,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
} = {}) {
  if (!String(downloadUrl ?? "").trim()) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.DOWNLOAD_URL_MISSING,
      bytes: null,
    });
  }

  try {
    const response = await fetchImpl(downloadUrl);
    if (!response?.ok) {
      return Object.freeze({
        ok: false,
        code: OTA2_ARTIFACT_CODES.BINARY_FETCH_FAILED,
        bytes: null,
        status: response?.status ?? null,
      });
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const verification = await verifyFirmwareBytes({
      bytes,
      expectedSha256,
      cryptoImpl,
    });
    return Object.freeze({
      ...verification,
      bytes: verification.ok ? bytes : null,
    });
  } catch (error) {
    return Object.freeze({
      ok: false,
      code: OTA2_ARTIFACT_CODES.BINARY_FETCH_FAILED,
      bytes: null,
      error: String(error),
    });
  }
}
