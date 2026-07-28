'use strict';

/**
 * V5 kompatibilitási indítófájl.
 *
 * A jelenlegi monolitikus szerver változatlanul a server2_legacy.js fájlban
 * marad. Ez az indító először beépíti a health és az API v2 modulokat, majd
 * elindítja a meglévő szervert.
 */

const {
  installExpressHealthBootstrap
} = require('./server/health-bootstrap');

const {
  installExpressApiV2Bootstrap
} = require('./server/api/v2/api-v2-bootstrap');

installExpressHealthBootstrap();
installExpressApiV2Bootstrap();

require('./server2_legacy');
