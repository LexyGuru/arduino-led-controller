'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

function read(
  relative
) {
  return fs.readFileSync(
    path.join(
      ROOT,
      relative
    ),
    'utf8'
  );
}

const page =
  read(
    'desktop-tauri/src/pages/V5SystemPage.tsx'
  );

const panel =
  read(
    'desktop-tauri/src/components/v5/V5ReleaseGatePanel.tsx'
  );

const hook =
  read(
    'desktop-tauri/src/hooks/useV5System.ts'
  );

assert.match(
  page,
  /V5ReleaseGatePanel/
);

assert.match(
  panel,
  /Promóció jóváhagyása/
);

assert.match(
  panel,
  /nem emel verziót/
);

assert.match(
  hook,
  /promotionReadiness/
);

assert.match(
  hook,
  /approvePromotion/
);

assert.match(
  hook,
  /revokePromotionApproval/
);

console.log(
  'OK: alpha.2 release-gate panel bekötve'
);
console.log(
  'OK: verify, approve és revoke desktop műveletek'
);
