'use strict';

function buildReleaseProvenance({
  product =
    'arduino-led-controller',
  version,
  targetVersion =
    '5.0.0-alpha.2',
  commit,
  generatedAt =
    new Date()
      .toISOString(),
  builderId =
    'https://github.com/LexyGuru/arduino-led-controller/deploy/build-versioned-release.sh',
  phase =
    'staging',
  sourceUri =
    'git+https://github.com/LexyGuru/arduino-led-controller.git'
}) {
  for (
    const [
      name,
      value
    ]
    of Object.entries({
      version,
      commit
    })
  ) {
    if (
      typeof value !==
        'string' ||
      !value.trim()
    ) {
      throw new TypeError(
        `A provenance mező kötelező: ${name}`
      );
    }
  }

  return {
    _type:
      'https://in-toto.io/Statement/v1',
    subject: [
      {
        name:
          product,
        digest: {
          gitCommit:
            commit
        }
      }
    ],
    predicateType:
      'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType:
          'https://lexyguru.dev/arduino-led-controller/release-bundle/v1',
        externalParameters: {
          version,
          targetVersion,
          phase
        },
        internalParameters: {
          repositoryClean:
            true,
          dependencyInstall:
            'npm-ci-omit-dev'
        },
        resolvedDependencies: [
          {
            uri:
              sourceUri,
            digest: {
              gitCommit:
                commit
            }
          }
        ]
      },
      runDetails: {
        builder: {
          id:
            builderId
        },
        metadata: {
          invocationId:
            `${product}-${commit.slice(
              0,
              12
            )}-${phase}`,
          startedOn:
            generatedAt,
          finishedOn:
            generatedAt
        },
        byproducts: [
          {
            name:
              'sbom.cdx.json'
          },
          {
            name:
              'secret-scan.json'
          },
          {
            name:
              'release-gate-report.json'
          }
        ]
      }
    }
  };
}

module.exports = {
  buildReleaseProvenance
};
