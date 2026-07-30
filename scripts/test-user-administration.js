'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const os =
  require('os');
const path =
  require('path');

const {
  UserRepository
} = require(
  '../server/security/user-repository'
);

async function main() {
  const tempRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'user-admin-'
      )
    );

  try {
    const repository =
      new UserRepository({
        filePath:
          path.join(
            tempRoot,
            'users.json'
          )
      });

    const admin =
      await repository
        .createUser({
          username:
            'admin',
          password:
            'administrator-password-123',
          displayName:
            'Administrator',
          role:
            'admin'
        });

    assert.strictEqual(
      admin.role,
      'admin'
    );

    const operator =
      await repository
        .createUser({
          username:
            'operator',
          password:
            'operator-password-123',
          role:
            'operator'
        });

    assert.strictEqual(
      operator.enabled,
      true
    );

    const updated =
      await repository
        .updateUser(
          'operator',
          {
            displayName:
              'LED Operator',
            role:
              'viewer'
          }
        );

    assert.strictEqual(
      updated.role,
      'viewer'
    );

    const password =
      await repository
        .changePassword(
          'operator',
          'new-operator-password-456'
        );

    assert.strictEqual(
      password
        .sessionsInvalidated,
      true
    );

    await assert.rejects(
      () =>
        repository
          .removeUser(
            'admin'
          ),
      (error) =>
        error.code ===
        'LAST_ADMIN_PROTECTED'
    );

    await repository
      .removeUser(
        'operator'
      );

    const users =
      await repository
        .listUsers();

    assert.deepStrictEqual(
      users.map(
        (user) =>
          user.username
      ),
      [
        'admin'
      ]
    );

    assert.strictEqual(
      'passwordHash' in
        users[0],
      false
    );

    console.log(
      'OK: felhasználó létrehozás és publikus lista'
    );
    console.log(
      'OK: szerepkör-, állapot- és jelszómódosítás'
    );
    console.log(
      'OK: utolsó aktív admin védelme'
    );
  } finally {
    fs.rmSync(
      tempRoot,
      {
        recursive:
          true,
        force:
          true
      }
    );
  }
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
