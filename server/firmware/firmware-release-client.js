'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const {
  FirmwareServiceError
} = require('./firmware-error');

const REPOSITORY_PATTERN =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function githubHeaders(token = '') {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'arduino-led-controller'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function firmwareVersionFromName(name) {
  const value = String(name || '');
  const match = value.match(
    /(?:^|_)(\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\.\d+)?)(?:_|\.ino\.bin$)/i
  );
  return match ? match[1].toLowerCase() : null;
}

function firmwareVersionKey(version) {
  const normalized = String(version || '').trim().toLowerCase();
  const match = normalized.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/
  );
  if (!match) return [0, 0, 0, -1, 0];

  const prereleaseRank = { alpha: 0, beta: 1, rc: 2 };
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    match[4] ? prereleaseRank[match[4]] : 3,
    match[5] ? Number(match[5]) : 0
  ];
}

function compareFirmwareVersions(left, right) {
  const a = firmwareVersionKey(left);
  const b = firmwareVersionKey(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function isFirmwareBinaryAsset(name) {
  const lower = String(name || '').toLowerCase();
  return (
    lower.endsWith('.ino.bin') ||
    (
      lower.startsWith('arduino_led_controller_firmware_') &&
      lower.endsWith('_uno_r4_wifi.bin')
    )
  ) && !lower.endsWith('.sha256');
}

function parseReleaseArtifact(release) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  const candidates = assets
    .filter((asset) => isFirmwareBinaryAsset(asset?.name))
    .map((binary) => {
      const checksumName = `${binary.name}.sha256`;
      const checksum = assets.find((asset) => (
        String(asset?.name || '') === checksumName
      ));
      if (!checksum) return null;

      const firmwareVersion = firmwareVersionFromName(binary.name);
      if (!firmwareVersion) return null;

      return { binary, checksum, firmwareVersion };
    })
    .filter(Boolean)
    .sort((left, right) => (
      compareFirmwareVersions(right.firmwareVersion, left.firmwareVersion)
    ));

  const selected = candidates[0];

  if (!selected) {
    throw new FirmwareServiceError(
      502,
      'FIRMWARE_ARTIFACT_INCOMPLETE',
      'A firmware-kiadás nem tartalmaz teljes, verziózható BIN + SHA-256 párt.'
    );
  }

  const body = String(release.body || '');
  const commitMatch = body.match(
    /Forrás commit:\s*([a-f0-9]{7,40})/i
  );

  return {
    id: release.id,
    name: selected.binary.name,
    digest: selected.binary.digest || '',
    downloadUrl: selected.binary.browser_download_url,
    checksumUrl: selected.checksum.browser_download_url,
    commit: commitMatch ? commitMatch[1] : release.target_commitish,
    firmwareVersion: selected.firmwareVersion,
    createdAt: release.published_at || release.created_at,
    tag: release.tag_name
  };
}

class FirmwareReleaseClient {
  constructor({
    repository,
    releaseTag,
    githubToken = '',
    transport = axios,
    maximumBytes = 16 * 1024 * 1024
  } = {}) {
    if (!REPOSITORY_PATTERN.test(String(repository || ''))) {
      throw new TypeError(
        'A firmware repository formátuma tulajdonos/projekt legyen.'
      );
    }

    this.repository = repository;
    this.releaseTag = String(releaseTag || 'firmware-latest');
    this.githubToken = String(githubToken || '');
    this.transport = transport;
    this.maximumBytes = Number(maximumBytes);
  }

  async getLatestArtifact() {
    const base =
      `https://api.github.com/repos/${this.repository}`;

    const response = await this.transport.get(
      `${base}/releases/tags/${encodeURIComponent(this.releaseTag)}`,
      {
        headers: githubHeaders(this.githubToken),
        timeout: 20000,
        maxRedirects: 0
      }
    );

    return parseReleaseArtifact(response.data);
  }

  async downloadVerified(artifact, targetPath) {
    const download = await this.transport.get(
      artifact.downloadUrl,
      {
        headers: githubHeaders(this.githubToken),
        responseType: 'arraybuffer',
        maxRedirects: 5,
        timeout: 60000,
        maxContentLength: this.maximumBytes
      }
    );

    const firmware = Buffer.from(download.data);

    if (
      firmware.length < 1024 ||
      firmware.length > this.maximumBytes
    ) {
      throw new FirmwareServiceError(
        502,
        'FIRMWARE_BINARY_INVALID',
        'A firmware-fájl mérete érvénytelen.',
        {
          size: firmware.length,
          maximumBytes: this.maximumBytes
        }
      );
    }

    const actual = crypto
      .createHash('sha256')
      .update(firmware)
      .digest('hex');

    const checksumResponse = await this.transport.get(
      artifact.checksumUrl,
      {
        headers: githubHeaders(this.githubToken),
        responseType: 'text',
        timeout: 20000,
        maxRedirects: 5
      }
    );

    const expected = String(checksumResponse.data)
      .trim()
      .split(/\s+/)[0];

    if (
      !/^[a-f0-9]{64}$/i.test(expected) ||
      actual.toLowerCase() !== expected.toLowerCase()
    ) {
      throw new FirmwareServiceError(
        502,
        'FIRMWARE_CHECKSUM_MISMATCH',
        'A firmware SHA-256 ellenőrzése sikertelen.',
        { expected, actual }
      );
    }

    if (
      artifact.digest &&
      artifact.digest.startsWith('sha256:') &&
      actual.toLowerCase() !== artifact.digest.slice(7).toLowerCase()
    ) {
      throw new FirmwareServiceError(
        502,
        'FIRMWARE_DIGEST_MISMATCH',
        'A GitHub firmware-digest ellenőrzése sikertelen.'
      );
    }

    await fs.promises.mkdir(path.dirname(targetPath), {
      recursive: true
    });

    await fs.promises.writeFile(targetPath, firmware, {
      mode: 0o600
    });

    return {
      path: targetPath,
      size: firmware.length,
      sha256: actual
    };
  }
}

module.exports = {
  FirmwareReleaseClient,
  REPOSITORY_PATTERN,
  compareFirmwareVersions,
  firmwareVersionFromName,
  firmwareVersionKey,
  githubHeaders,
  isFirmwareBinaryAsset,
  parseReleaseArtifact
};
