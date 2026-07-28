'use strict';

/**
 * Átmeneti v5 kompatibilitási indítófájl.
 *
 * A jelenlegi monolitikus szerver változatlanul a gyökérben található
 * server2_legacy.js fájlban marad. Ez az indító először beépíti a hitelesítés
 * nélküli, csak állapotinformációt szolgáltató health végpontokat, majd
 * elindítja a meglévő szervert.
 */

const {
  installExpressHealthBootstrap
} = require('./server/health-bootstrap');

installExpressHealthBootstrap();
require('./server2_legacy');
