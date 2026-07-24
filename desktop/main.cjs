const { app, BrowserWindow, dialog, shell, ipcMain, safeStorage } = require('electron');
const { fork } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

let backend;
let mainWindow;

function desktopSecretPath() { return path.join(app.getPath('userData'), 'desktop-secret.bin'); }
function readOtaPassword() {
  try { return fs.existsSync(desktopSecretPath()) ? safeStorage.decryptString(fs.readFileSync(desktopSecretPath())) : ''; }
  catch (_) { return ''; }
}
function storeOtaPassword(password) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('A rendszer titkosított tárhelye nem érhető el.');
  fs.writeFileSync(desktopSecretPath(), safeStorage.encryptString(password), { mode: 0o600 });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function waitForBackend(url, tries = 40) {
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const response = await fetch(`${url}/api/auth/status`);
      if (response.ok) return;
    } catch (_) { /* The embedded service is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('A helyi LED vezérlő szolgáltatás nem indult el.');
}

async function startDesktopApp() {
  const port = await findFreePort();
  const userData = app.getPath('userData');
  const sourceRoot = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const otaPassword = readOtaPassword();
  backend = fork(path.join(sourceRoot, 'server2_final.js'), [], {
    env: {
      ...process.env,
      PORT: String(port),
      BIND_HOST: '127.0.0.1',
      COOKIE_SECURE: '0',
      DATA_DIR: path.join(userData, 'data'),
      CONFIG_DIR: path.join(userData, 'config'),
      SCHEDULES_DIR: path.join(userData, 'schedules'),
      FIRMWARE_DIR: path.join(userData, 'firmware'),
      OTA_TOOL_PATH: path.join(sourceRoot, 'tools', 'arduinoOTA', process.platform === 'win32' ? 'arduinoOTA.exe' : 'arduinoOTA'),
      AUTH_FILE: path.join(userData, 'config', 'users.json'),
      AUDIT_FILE: path.join(userData, 'data', 'audit-log.jsonl'),
      // Az OTA jelszó szándékosan nincs a desktop alkalmazásban.
      OTA_PASSWORD: otaPassword
    },
    stdio: 'ignore'
  });
  backend.on('exit', (code) => { if (code && mainWindow) dialog.showErrorBox('LED Controller hiba', `A helyi szolgáltatás leállt (kód: ${code}).`); });
  const url = `http://127.0.0.1:${port}`;
  await waitForBackend(url);
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 960, minHeight: 680,
    backgroundColor: '#15181c',
    title: 'Arduino LED Controller',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => { shell.openExternal(target); return { action: 'deny' }; });
  await mainWindow.loadURL(url);
}

ipcMain.handle('desktop:ota-status', () => ({ configured: Boolean(readOtaPassword()), encryptionAvailable: safeStorage.isEncryptionAvailable() }));
ipcMain.handle('desktop:ota-save', (_event, password) => {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Az OTA jelszó legalább 12 karakteres legyen.');
  storeOtaPassword(password);
  if (backend?.connected) backend.send({ type: 'set-ota-password', password });
  return { configured: true };
});

app.whenReady().then(startDesktopApp).catch((error) => { dialog.showErrorBox('Indítási hiba', error.message); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (backend && !backend.killed) backend.kill('SIGTERM'); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) startDesktopApp(); });
