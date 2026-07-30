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

function parseReleaseArtifact(release) {
  const assets = Array.isArray(release?.assets)
    ? release.assets
    : [];

  const binary = assets.find((asset) => (
    String(asset?.name || '').endsWith('.ino.bin')
  ));

  const checksum = assets.find((asset) => (
    String(asset?.name || '').endsWith('.ino.bin.sha256')
  ));

  if (!binary || !checksum) {
    throw new FirmwareServiceError(
      502,
      'FIRMWARE_ARTIFACT_INCOMPLETE',
      'A firmware-kiadás nem tartalmaz teljes bináris és SHA-256 csomagot.'
    );
  }

  const body = String(release.body || '');
  const versionMatch = body.match(
    /Firmware verzió:\s*([0-9]+(?:\.[0-9]+){1,3})/i
  );
  const commitMatch = body.match(
    /Forrás commit:\s*([a-f0-9]{7,40})/i
  );

  return {
    id: release.id,
    name: binary.name,
    digest: binary.digest || '',
    downloadUrl: binary.browser_download_url,
    checksumUrl: checksum.browser_download_url,
    commit: commitMatch ? commitMatch[1] : release.target_commitish,
    firmwareVersion: versionMatch ? versionMatch[1] : null,
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
  githubHeaders,
  parseReleaseArtifact
};
