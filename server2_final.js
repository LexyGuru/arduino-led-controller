const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const { spawn, execFile } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const winston = require('winston');
require('dotenv').config();

const execFileAsync = promisify(execFile);

// Az Electron alkalmazás futó háttérfolyamata biztonságosan, csak memóriában
// adhatja át a rendszer titkosított tárhelyéből kiolvasott OTA-jelszót.
process.on('message', (message) => {
  if (message && message.type === 'set-ota-password' && typeof message.password === 'string') config.otaPassword = message.password;
});

// ========================= KONFIGURÁCIÓ =========================

const config = {
  port: process.env.PORT || 3000,
  bindHost: process.env.BIND_HOST || '0.0.0.0',
  arduinoIP: process.env.ARDUINO_IP || '10.0.0.117',
  arduinoPort: process.env.ARDUINO_PORT || 80,
  consolePort: process.env.CONSOLE_PORT || 81,
  dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
  configDir: process.env.CONFIG_DIR || path.join(__dirname, 'config'),
  schedulesDir: process.env.SCHEDULES_DIR || path.join(__dirname, 'schedules'),
  firmwareDir: process.env.FIRMWARE_DIR || path.join(__dirname, 'data', 'firmware'),
  firmwareRepo: process.env.FIRMWARE_REPOSITORY || 'LexyGuru/arduino-led-controller',
  firmwareReleaseTag: process.env.FIRMWARE_RELEASE_TAG || 'firmware-latest',
  otaToolPath: process.env.OTA_TOOL_PATH || path.join(__dirname, 'tools', 'arduinoOTA', 'arduinoOTA'),
  otaPassword: process.env.OTA_PASSWORD || '',
  cookieSecure: process.env.COOKIE_SECURE === '1',
  authFile: process.env.AUTH_FILE || path.join(__dirname, 'config', 'users.json'),
  auditFile: process.env.AUDIT_FILE || path.join(__dirname, 'data', 'audit-log.jsonl'),
  version: getAppVersion()
};

function getAppVersion() {
  try {
    const versionPath = path.join(__dirname, 'version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return versionData.version;
    }
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (typeof packageData.version === 'string') return packageData.version;
    }
  } catch (error) {
    console.warn('Cannot load version info:', error.message);
  }
  return '1.0.0';
}

// Directory alapú inicializálás
function ensureDirectories() {
  try {
    if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir);
    if (!fs.existsSync(config.configDir)) fs.mkdirSync(config.configDir);
    if (!fs.existsSync(config.schedulesDir)) fs.mkdirSync(config.schedulesDir);
    if (!fs.existsSync(config.firmwareDir)) fs.mkdirSync(config.firmwareDir, { recursive: true });
    console.log('✅ Konfigurációs könyvtárak létrehozva');
  } catch (error) {
    console.warn('Directory creation warning:', error.message);
  }
}

ensureDirectories();

// A kezelőfelületről módosítható Arduino-célgép. Az .env csak első indításkor
// ad alapértéket; a mentett beállítás túléli a szerver újraindítását.
const runtimeSettingsPath = path.join(config.configDir, 'server-settings.json');
function loadRuntimeSettings() {
  try {
    if (!fs.existsSync(runtimeSettingsPath)) return;
    const saved = fs.readJsonSync(runtimeSettingsPath);
    if (typeof saved.arduinoIP === 'string' && saved.arduinoIP.trim()) config.arduinoIP = saved.arduinoIP.trim();
    if (Number.isInteger(saved.arduinoPort) && saved.arduinoPort > 0 && saved.arduinoPort < 65536) config.arduinoPort = saved.arduinoPort;
  } catch (error) {
    console.warn('Runtime settings load warning:', error.message);
  }
}
function saveRuntimeSettings() {
  fs.writeJsonSync(runtimeSettingsPath, { arduinoIP: config.arduinoIP, arduinoPort: Number(config.arduinoPort) }, { spaces: 2 });
}
loadRuntimeSettings();

// ========================= LOGGER =========================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// File logging only if directory exists
try {
  if (fs.existsSync(config.dataDir)) {
    logger.add(new winston.transports.File({
      filename: path.join(config.dataDir, 'error.log'),
      level: 'error'
    }));
    logger.add(new winston.transports.File({
      filename: path.join(config.dataDir, 'combined.log')
    }));
  }
} catch (error) {
  console.warn('File logging not available:', error.message);
}

// ========================= EXPRESS APP =========================

const app = express();
const server = http.createServer(app);

// Socket.IO WebSocket (console port 81)
const io = socketIo(server, {
  port: config.consolePort,
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// A kezelofelulet masodpercenkent frissulo, csak olvashato Arduino-statuszt
// es naplot ker. Ezeket nem szabad beleszamolni a vedelmi korlatba, kulonben
// nehany perc utan a szerver sajat maga tiltja le a kijelzest. A modosito
// API-hivasok (POST/PUT/DELETE) tovabbra is korlatozottak.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
});
app.use('/api/', writeLimiter);

// Serve static files
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static('public'));
}

// ========================= CSFR PROTECTION =========================

const csrfSecret = process.env.CSRF_SECRET || uuidv4();
const csrfStore = new Map();

function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validateCSRFToken(token) {
  const requestTimestamp = Date.now();
  const tokenEntry = csrfStore.get(token);
  
  if (!tokenEntry) return false;
  
  const tokenAge = requestTimestamp - tokenEntry.timestamp;
  if (tokenAge > 300000) { // 5 minutes
    csrfStore.delete(token);
    return false;
  }
  
  return tokenEntry.token === token;
}

// ========================= FELHASZNÁLÓK ÉS NAPLÓ =========================

let authData = { sessionSecret: crypto.randomBytes(32).toString('hex'), users: [] };

function loadAuthData() {
  try {
    if (fs.existsSync(config.authFile)) {
      const stored = fs.readJsonSync(config.authFile);
      if (typeof stored.sessionSecret === 'string' && Array.isArray(stored.users)) authData = stored;
    }
  } catch (error) {
    console.warn('Felhasználói adatok betöltése sikertelen:', error.message);
  }
}
function saveAuthData() {
  fs.writeJsonSync(config.authFile, authData, { spaces: 2, mode: 0o600 });
  try { fs.chmodSync(config.authFile, 0o600); } catch (error) { /* platformfüggő */ }
}
loadAuthData();

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
  const item = cookies.find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
function signSession(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authData.sessionSecret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
function sessionUser(req) {
  try {
    const token = readCookie(req, 'led_session');
    if (!token) return null;
    const [encoded, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', authData.sessionSecret).update(encoded).digest('base64url');
    if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload || payload.exp < Date.now()) return null;
    const user = authData.users.find((candidate) => candidate.username === payload.username && candidate.sessionVersion === payload.sessionVersion && candidate.enabled !== false);
    return user ? { username: user.username, role: user.role, displayName: user.displayName || user.username } : null;
  } catch (error) { return null; }
}
function setSession(res, user) {
  const token = signSession({ username: user.username, sessionVersion: user.sessionVersion, exp: Date.now() + 12 * 60 * 60 * 1000 });
  res.cookie('led_session', token, { httpOnly: true, sameSite: 'strict', secure: config.cookieSecure, maxAge: 12 * 60 * 60 * 1000, path: '/' });
}
function clearSession(res) { res.clearCookie('led_session', { httpOnly: true, sameSite: 'strict', secure: config.cookieSecure, path: '/' }); }
function scryptPassword(password, salt) {
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(derived.toString('hex'))));
}
async function createUserRecord({ username, password, displayName, role = 'operator' }) {
  const normalized = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) throw new Error('A felhasználónév 3–32 karakteres, kisbetűs betűkből, számokból és . _ - jelekből álljon.');
  if (typeof password !== 'string' || password.length < 12) throw new Error('A jelszó legalább 12 karakter legyen.');
  if (!['admin', 'operator', 'viewer'].includes(role)) throw new Error('Ismeretlen jogosultsági szint.');
  if (authData.users.some((user) => user.username === normalized)) throw new Error('Ez a felhasználónév már létezik.');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = await scryptPassword(password, salt);
  const user = { username: normalized, displayName: String(displayName || normalized).trim().slice(0, 64), role, salt, passwordHash, sessionVersion: 1, enabled: true, createdAt: new Date().toISOString() };
  authData.users.push(user); saveAuthData();
  return user;
}
async function verifyPassword(user, password) {
  const hash = await scryptPassword(String(password || ''), user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}
function audit(req, action, details = {}) {
  const entry = { timestamp: new Date().toISOString(), user: req.user ? req.user.username : 'anonymous', role: req.user ? req.user.role : null, ip: req.ip, action, details };
  fs.appendFile(config.auditFile, `${JSON.stringify(entry)}\n`).catch((error) => logger.error(`Audit napló hiba: ${error.message}`));
}
function requireApiUser(req, res, next) {
  if (req.path.startsWith('/auth/')) return next();
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Bejelentkezés szükséges.', code: 'AUTH_REQUIRED' });
  req.user = user;
  if (req.method !== 'GET' && req.method !== 'HEAD' && user.role === 'viewer') return res.status(403).json({ error: 'Ehhez a művelethez nincs jogosultságod.', code: 'FORBIDDEN' });
  if (user.role !== 'admin' && (req.path.startsWith('/settings') || req.path.startsWith('/firmware'))) return res.status(403).json({ error: 'Ezt a rendszerbeállítást csak adminisztrátor módosíthatja.', code: 'ADMIN_REQUIRED' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Adminisztrátori jogosultság szükséges.', code: 'ADMIN_REQUIRED' });
  next();
}

// ========================= ARDUINO API WRAPPER =========================

class ArduinoAPI {
  constructor(ip, port) {
    this.setTarget(ip, port);
    this.timeout = Number(process.env.ARDUINO_TIMEOUT_MS) || 30000;
    this.maxRetries = Number(process.env.ARDUINO_RETRY_COUNT) || 3;
    this.retryDelay = Number(process.env.ARDUINO_RETRY_DELAY) || 2000;
  }

  setTarget(ip, port) {
    this.baseURL = `http://${ip}:${port}`;
  }

  // A macOS-es Electron gyermekfolyamatoknál egyes hálózatokon a Node TCP
  // kapcsolat EHOSTUNREACH hibával elakadhat, miközben a rendszer hálózata
  // eléri az eszközt. A desktop kiadás ilyenkor a macOS beépített curljét
  // használja: nincs külön telepítés és nem érinti a Windows/Linux kiadást.
  async requestWithMacNativeHttp(method, url, options) {
    const marker = '__LED_HTTP_STATUS__:';
    const args = [
      '--silent', '--show-error', '--location',
      '--connect-timeout', '5',
      '--max-time', String(Math.max(5, Math.ceil(this.timeout / 1000))),
      '--request', String(method).toUpperCase(),
      '--header', 'Content-Type: application/json',
      '--header', `X-Request-ID: ${options.headers['X-Request-ID']}`,
      '--write-out', `\\n${marker}%{http_code}`,
      url
    ];
    if (options.data) args.splice(args.length - 1, 0, '--data', JSON.stringify(options.data));

    let stdout;
    try {
      ({ stdout } = await execFileAsync('/usr/bin/curl', args, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
    } catch (error) {
      throw new Error(`macOS natív HTTP hiba: ${error.stderr?.trim() || error.message}`);
    }

    const separator = stdout.lastIndexOf(`\n${marker}`);
    const body = separator >= 0 ? stdout.slice(0, separator) : stdout;
    const status = separator >= 0 ? Number(stdout.slice(separator + marker.length + 1).trim()) : 0;
    if (!Number.isInteger(status) || status < 200 || status >= 300) {
      const error = new Error(`Arduino HTTP hiba: ${status || 'ismeretlen'}`);
      error.response = { status, data: body };
      throw error;
    }
    try { return JSON.parse(body); } catch (_) { return body; }
  }

  async request(method, endpoint, data = null, retryCount = 0) {
    const options = {
      method,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': uuidv4()
      }
    };

    if (data) {
      options.data = data;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    logger.debug(`Arduino ${method} ${endpoint}`);

    try {
      const useMacNativeHttp = process.platform === 'darwin' && process.env.ARDUINO_HTTP_TRANSPORT === 'curl';
      const response = useMacNativeHttp
        ? { data: await this.requestWithMacNativeHttp(method, url, options) }
        : await axios({ ...options, url });
      
      logger.info(`Arduino ${method} ${endpoint}: ✅ Success`);
      return response.data;
    } catch (error) {
      logger.error(`Arduino ${method} ${endpoint} ❌ error: ${error.message}`);
      
      if (error.response) {
        if (error.response.status >= 500 && retryCount < this.maxRetries) {
          await this.sleep(this.retryDelay);
          return this.request(method, endpoint, data, retryCount + 1);
        }
        const errorMsg = error.response.data?.error || 
                        error.response.data?.message || 
                        `Arduino ${method} hiba: ${error.response.status}`;
        throw new Error(errorMsg);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Arduino kapcsolat túl lassú (timeout)');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Arduino nem elérhető: ${config.arduinoIP}:${config.arduinoPort}`);
      } else {
        throw new Error(`Arduino hiba: ${error.message}`);
      }
    }
  }

  async get(endpoint) {
    return await this.request('get', endpoint);
  }

  async post(endpoint, data) {
    return await this.request('post', endpoint, data);
  }

  async put(endpoint, data) {
    return await this.request('put', endpoint, data);
  }

  async delete(endpoint) {
    return await this.request('delete', endpoint);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const arduino = new ArduinoAPI(config.arduinoIP, config.arduinoPort);

// ========================= LED API WRAPPER =========================

class LEDAPI {
  constructor(ip, port) {
    this.setTarget(ip, port);
    this.timeout = Number(process.env.ARDUINO_TIMEOUT_MS) || 30000;
    this.maxRetries = Number(process.env.ARDUINO_RETRY_COUNT) || 3;
    this.retryDelay = Number(process.env.ARDUINO_RETRY_DELAY) || 2000;
  }

  setTarget(ip, port) {
    this.baseURL = `http://${ip}:${port}`;
  }

  async setLed(id, params, retryCount = 0) {
    try {
      // LED API: GET /api/led/:id?param1=value1&param2=value2
      // Az Arduino firmware nem dekódolja a URL-kódolt vesszőket, ezért az
      // ellenőrzött RGB értékeket változatlanul kell továbbítani.
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      const url = `${this.baseURL}/api/led/${id}?${queryString}`;
      
      logger.debug(`LED ${id} API: ${url}`);
      
      const response = await axios.get(url, {
        timeout: this.timeout
      });
      
      logger.info(`LED ${id} SET: ✅ Success`);
      return response.data;
    } catch (error) {
      logger.error(`LED ${id} SET ❌ error: ${error.message}`);
      
      if (error.response) {
        if (error.response.status >= 500 && retryCount < this.maxRetries) {
          await this.sleep(this.retryDelay);
          return this.setLed(id, params, retryCount + 1);
        }
        const errorMsg = error.response.data?.error || 
                        error.response.data?.message || 
                        `LED vezérlési hiba: ${error.response.status}`;
        throw new Error(errorMsg);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('LED API timeout');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error(`Arduino nem elérhető: ${config.arduinoIP}:${config.arduinoPort}`);
      }
      
      throw error;
    }
  }

  async getLedStatus(id, retryCount = 0) {
    try {
      const url = `${this.baseURL}/api/led/status`;
      const response = await axios.get(url, {
        timeout: this.timeout
      });
      
      const leds = response.data.leds || [];
      
      if (id !== -1) {
        const led = leds.find(l => l.id === id);
        if (led) {
          return led;
        }
        return null;
      }
      
      return { leds };
    } catch (error) {
      logger.error(`LED ${id} STATUS ❌ error: ${error.message}`);
      throw error;
    }
  }
}

const ledAPI = new LEDAPI(config.arduinoIP, config.arduinoPort);

// ========================= HELYI HETI ÜTEMEZÉS =========================
// Átmeneti megoldás SD-kártya nélkül: a Macen futó szerver tárolja és hajtja
// végre az ütemezéseket. A számítógépnek a megadott időpontokban futnia kell.
const localSchedulePath = path.join(config.schedulesDir, 'weekly-led-schedules.json');
let localSchedules = [];
let lastScheduleMinute = '';

function loadLocalSchedules() {
  try {
    localSchedules = fs.existsSync(localSchedulePath)
      ? fs.readJsonSync(localSchedulePath)
      : [];
    if (!Array.isArray(localSchedules)) localSchedules = [];
  } catch (error) {
    logger.error(`Helyi ütemezések betöltési hibája: ${error.message}`);
    localSchedules = [];
  }
}

function saveLocalSchedules() {
  fs.writeJsonSync(localSchedulePath, localSchedules, { spaces: 2 });
}

// Az Arduino EEPROM-os időzítőjének kompakt, hordozható formátuma.
// Rekordonként: nap, óra, perc, majd LED-enként apply/állapot/fényerő/effekt/sebesség/RGB.
function encodeArduinoSchedules(schedules) {
  if (schedules.length > 60) throw new Error('Az Arduino belső időzítője legfeljebb 60 bejegyzést tárolhat.');
  const recordSize = 27;
  const payload = Buffer.alloc(schedules.length * recordSize);
  schedules.forEach((schedule, index) => {
    const offset = index * recordSize;
    const [hour, minute] = schedule.time.split(':').map(Number);
    payload[offset] = schedule.day; payload[offset + 1] = hour; payload[offset + 2] = minute;
    for (let ledId = 1; ledId <= 3; ledId++) {
      const led = schedule.leds.find((item) => item.id === ledId);
      const at = offset + 3 + (ledId - 1) * 8;
      if (!led) continue;
      payload[at] = 1; payload[at + 1] = led.enabled ? 1 : 0; payload[at + 2] = led.brightness;
      payload[at + 3] = led.effect; payload[at + 4] = Number.isInteger(led.speed) ? led.speed : 50;
      payload[at + 5] = led.color[0]; payload[at + 6] = led.color[1]; payload[at + 7] = led.color[2];
    }
  });
  return payload.toString('hex');
}
async function syncSchedulesToArduino() {
  let result = { success: true, count: 0 };
  for (let index = 0; index < localSchedules.length; index++) {
    result = await arduino.get(`/api/schedules/chunk?index=${index}&total=${localSchedules.length}&payload=${encodeArduinoSchedules([localSchedules[index]])}`);
  }
  if (result.count !== localSchedules.length) throw new Error(`Az Arduino csak ${result.count || 0}/${localSchedules.length} bejegyzést mentett el.`);
  logger.info(`Arduino EEPROM időzítés szinkronizálva: ${localSchedules.length} bejegyzés`);
  return result;
}

function validateLocalSchedule(schedule) {
  if (!Number.isInteger(schedule.day) || schedule.day < 1 || schedule.day > 7) return 'A nap 1 (hétfő) és 7 (vasárnap) közötti szám legyen.';
  if (typeof schedule.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return 'Az idő formátuma HH:MM legyen.';
  if (!Array.isArray(schedule.leds) || schedule.leds.length === 0) return 'Legalább egy LED-et ki kell választani.';
  for (const led of schedule.leds) {
    if (!Number.isInteger(led.id) || led.id < 1 || led.id > 3 || typeof led.enabled !== 'boolean') return 'Érvénytelen LED-beállítás.';
    if (!Number.isInteger(led.brightness) || led.brightness < 0 || led.brightness > 255) return 'A fényerő 0 és 255 közötti egész szám legyen.';
    if (!Number.isInteger(led.effect) || led.effect < 0 || led.effect > 4) return 'Az effekt 0 és 4 közötti egész szám legyen.';
    if (led.speed !== undefined && (!Number.isInteger(led.speed) || led.speed < 1 || led.speed > 100)) return 'Az effekt sebessége 1 és 100 közötti egész szám legyen.';
    if (!Array.isArray(led.color) || led.color.length !== 3 || led.color.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return 'Érvénytelen RGB szín.';
  }
  return null;
}

async function runLocalSchedules() {
  // Ha az Arduino már saját EEPROM-időzítést használ, a szerver nem küldi el
  // még egyszer ugyanazt a parancsot. Kapcsolati hiba esetén a szerveres
  // végrehajtás úgysem tudná elérni az eszközt, az Arduino viszont önállóan fut.
  try {
    const status = await arduino.get('/api/status');
    if (status.scheduler === 'arduino-eeprom' && Number(status.scheduleCount) > 0) return;
  } catch (error) { return; }
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay(); // hétfő=1 ... vasárnap=7
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const minuteKey = `${now.toDateString()}-${time}`;
  if (minuteKey === lastScheduleMinute) return;
  lastScheduleMinute = minuteKey;

  const dueSchedules = localSchedules.filter(schedule => schedule.day === day && schedule.time === time);
  for (const schedule of dueSchedules) {
    logger.info(`Helyi ütemezés fut: ${schedule.id} (${schedule.time})`);
    for (const led of schedule.leds) {
      try {
        const result = await ledAPI.setLed(led.id, {
          enabled: led.enabled ? '1' : '0',
          brightness: led.brightness,
          effect: led.effect,
          speed: Number.isInteger(led.speed) ? led.speed : 50,
          color: led.color.join(',')
        });
        io.emit('scheduledLedUpdate', { scheduleId: schedule.id, led, result });
      } catch (error) {
        logger.error(`Helyi ütemezés LED ${led.id} hibája: ${error.message}`);
      }
    }
  }
}

loadLocalSchedules();
cron.schedule('* * * * *', runLocalSchedules, { timezone: 'Europe/Vienna' });

// ========================= FILE UPLOAD CONFIG =========================

// File upload configuration for multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.schedulesDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1000000);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 1024 * 1024 }, // 1MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.js' || ext === '.json') {
      cb(null, true);
    } else {
      cb(new Error('Csak .js és .json fájlok engedélyezettek!'));
    }
  }
});

// ========================= BELÉPÉS ÉS HOZZÁFÉRÉS =========================

app.get('/api/auth/status', (req, res) => {
  const user = sessionUser(req);
  res.json({ authenticated: Boolean(user), user, setupNeeded: authData.users.length === 0, cookieSecure: config.cookieSecure });
});

app.post('/api/auth/setup', async (req, res) => {
  if (authData.users.length > 0) return res.status(409).json({ error: 'Az első adminisztrátor már létre lett hozva.' });
  try {
    const user = await createUserRecord({ ...req.body, role: 'admin' });
    setSession(res, user);
    req.user = { username: user.username, role: user.role, displayName: user.displayName };
    audit(req, 'Első adminisztrátor létrehozva');
    res.status(201).json({ success: true, user: req.user });
  } catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const username = String(req.body?.username || '').trim().toLowerCase();
  const user = authData.users.find((candidate) => candidate.username === username && candidate.enabled !== false);
  if (!user || !(await verifyPassword(user, req.body?.password))) {
    audit(req, 'Sikertelen bejelentkezés', { username });
    return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' });
  }
  setSession(res, user);
  req.user = { username: user.username, role: user.role, displayName: user.displayName };
  audit(req, 'Sikeres bejelentkezés');
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  req.user = sessionUser(req);
  if (req.user) audit(req, 'Kijelentkezés');
  clearSession(res); res.json({ success: true });
});

function adminUser(req, res) {
  req.user = sessionUser(req);
  if (!req.user) { res.status(401).json({ error: 'Bejelentkezés szükséges.' }); return false; }
  if (req.user.role !== 'admin') { res.status(403).json({ error: 'Adminisztrátori jogosultság szükséges.' }); return false; }
  return true;
}
app.get('/api/auth/users', (req, res) => {
  if (!adminUser(req, res)) return;
  res.json({ users: authData.users.map(({ username, displayName, role, enabled, createdAt }) => ({ username, displayName, role, enabled, createdAt })) });
});
app.post('/api/auth/users', async (req, res) => {
  if (!adminUser(req, res)) return;
  try {
    const user = await createUserRecord(req.body || {});
    audit(req, 'Felhasználó létrehozva', { username: user.username, role: user.role });
    res.status(201).json({ success: true, user: { username: user.username, displayName: user.displayName, role: user.role } });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
app.get('/api/auth/audit', async (req, res) => {
  if (!adminUser(req, res)) return;
  try {
    if (!fs.existsSync(config.auditFile)) return res.json({ entries: [] });
    const entries = (await fs.readFile(config.auditFile, 'utf8')).trim().split('\n').filter(Boolean).slice(-500).map((line) => JSON.parse(line)).reverse();
    res.json({ entries });
  } catch (error) { res.status(500).json({ error: 'A szervernapló nem olvasható.' }); }
});

app.use('/api', requireApiUser);
app.use('/api', (req, res, next) => {
  res.once('finish', () => {
    if (req.user && req.method !== 'GET' && req.method !== 'HEAD' && !req.path.startsWith('/auth/')) audit(req, `${req.method} ${req.path}`, { status: res.statusCode });
  });
  next();
});

// ========================= ARDUINO API ROUTES =========================

const ARDUINO_READ_ENDPOINTS = {
  status: '/api/status',
  config: '/api/config',
  memory: '/api/memory',
  ledStatus: '/api/led/status',
  consoleLogs: '/api/console/logs',
  consoleStats: '/api/console/stats',
  scheduleFiles: '/api/schedule/files',
  scheduleStatus: '/api/schedule/status',
  scheduleDebug: '/api/schedule/debug'
};

const readArduino = (endpoint) => async (req, res) => {
  try {
    res.json(await arduino.get(endpoint));
  } catch (error) {
    logger.error(`Read Arduino ${endpoint} error:`, error);
    res.status(502).json({ 
      error: error.message, 
      code: 'ARDUINO_TIMEOUT',
      timestamp: new Date().toISOString()
    });
  }
};

const commandArduino = (endpoint, event = null) => async (req, res) => {
  try {
    const result = await arduino.get(endpoint);
    if (event && io) io.emit(event, result);
    res.json(result);
  } catch (error) {
    logger.error(`Command Arduino ${endpoint} error:`, error);
    res.status(502).json({ 
      error: error.message, 
      code: 'ARDUINO_TIMEOUT',
      timestamp: new Date().toISOString()
    });
  }
};

// Read-only endpoints
app.get('/api/arduino/status', readArduino('/api/status'));
app.get('/api/arduino/config', readArduino('/api/config'));
app.get('/api/arduino/memory', readArduino('/api/memory'));
app.get('/api/arduino/leds', readArduino('/api/led/status'));
app.get('/api/arduino/console/logs', readArduino('/api/console/logs'));
app.get('/api/arduino/console/stats', readArduino('/api/console/stats'));
app.get('/api/arduino/schedules/files', readArduino('/api/schedule/files'));
app.get('/api/arduino/schedules/status', readArduino('/api/schedule/status'));
app.get('/api/arduino/schedules/debug', readArduino('/api/schedule/debug'));

// Schedule day query
app.get('/api/arduino/schedules/day/:day', async (req, res) => {
  const day = Number(req.params.day);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return res.status(400).json({ 
      error: 'A nap indexe 0 (Hétfő) és 6 (Vasárnap) közötti egész szám legyen.', 
      code: 'INVALID_DAY' 
    });
  }
  try {
    res.json(await arduino.get(`/api/schedule/day/${day}`));
  } catch (error) {
    res.status(502).json({ error: error.message, code: 'ARDUINO_TIMEOUT' });
  }
});

// Schedule file query
app.get('/api/arduino/schedules/file/:filename', async (req, res) => {
  const filename = req.params.filename;
  if (!/^S[0-6]L[1-3]\.JS$/i.test(filename)) {
    return res.status(400).json({ 
      error: 'Érvénytelen ütemezésfájl-név. Formátum: S0-L1.JS', 
      code: 'INVALID_FILENAME' 
    });
  }
  try {
    res.json(await arduino.get(`/api/schedule/file/${filename}`));
  } catch (error) {
    res.status(502).json({ error: error.message, code: 'ARDUINO_TIMEOUT' });
  }
});

// Command endpoints
app.post('/api/arduino/restart', commandArduino('/api/restart', 'arduinoRestarting'));
app.post('/api/arduino/leds/reset', commandArduino('/api/led/reset', 'ledsReset'));
app.post('/api/arduino/leds/debug', commandArduino('/api/led/debug', 'ledDebug'));
app.post('/api/arduino/console/clear', commandArduino('/api/console/clear', 'consoleCleared'));
app.post('/api/arduino/schedules/reload', commandArduino('/api/schedule/reload', 'schedulesReloaded'));
app.post('/api/arduino/schedules/generate', commandArduino('/api/schedule/generate', 'schedulesGenerated'));
app.delete('/api/arduino/schedules', commandArduino('/api/schedule/clear', 'schedulesCleared'));

// LED vezérlés: a böngésző JSON-t küld, az Arduino pedig GET query paramétert
// vár. Ez az útvonal végzi el a két formátum közötti átalakítást.
app.post('/api/arduino/led/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { enabled, brightness, effect, speed, color } = req.body || {};

  if (!Number.isInteger(id) || id < 1 || id > 3) {
    return res.status(400).json({ error: 'A LED azonosítója 1, 2 vagy 3 lehet.' });
  }

  const params = {};
  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Az enabled értéke igaz vagy hamis lehet.' });
    params.enabled = enabled ? '1' : '0';
  }
  if (brightness !== undefined) {
    if (!Number.isInteger(brightness) || brightness < 0 || brightness > 255) return res.status(400).json({ error: 'A fényerő 0 és 255 közötti egész szám legyen.' });
    params.brightness = brightness;
  }
  if (effect !== undefined) {
    if (!Number.isInteger(effect) || effect < 0 || effect > 4) return res.status(400).json({ error: 'Az effekt 0 és 4 közötti egész szám legyen.' });
    params.effect = effect;
  }
  if (speed !== undefined) {
    if (!Number.isInteger(speed) || speed < 1 || speed > 100) return res.status(400).json({ error: 'Az effekt sebessége 1 és 100 közötti egész szám legyen.' });
    params.speed = speed;
  }
  if (color !== undefined) {
    const rgb = Array.isArray(color) ? color : String(color).split(',').map(Number);
    if (rgb.length !== 3 || rgb.some(value => !Number.isInteger(value) || value < 0 || value > 255)) {
      return res.status(400).json({ error: 'A szín három, 0 és 255 közötti RGB értékből álljon.' });
    }
    params.color = rgb.join(',');
  }
  if (Object.keys(params).length === 0) return res.status(400).json({ error: 'Legalább egy LED-beállítást meg kell adni.' });

  try {
    const result = await ledAPI.setLed(id, params);
    io.emit('ledUpdate', { id, ...req.body, result });
    res.json(result);
  } catch (error) {
    logger.error(`LED ${id} vezérlési hiba: ${error.message}`);
    res.status(502).json({ error: error.message, code: 'LED_CONTROL_ERROR' });
  }
});

app.post('/api/arduino/all-on', commandArduino('/api/all-on', 'allLedsUpdate'));
app.post('/api/arduino/all-off', commandArduino('/api/all-off', 'allLedsUpdate'));

// ========================= SZERVER BEÁLLÍTÁSOK =========================

app.get('/api/settings', (req, res) => {
  res.json({ arduinoIP: config.arduinoIP, arduinoPort: Number(config.arduinoPort) });
});

app.put('/api/settings/arduino', (req, res) => {
  const { arduinoIP, arduinoPort = 80 } = req.body || {};
  const host = typeof arduinoIP === 'string' ? arduinoIP.trim() : '';
  const port = Number(arduinoPort);
  if (!/^[a-zA-Z0-9.-]+$/.test(host) || host.length > 253) {
    return res.status(400).json({ error: 'Adj meg érvényes IP-címet vagy helyi gépnevet.' });
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return res.status(400).json({ error: 'A port 1 és 65535 közötti egész szám legyen.' });
  }
  config.arduinoIP = host;
  config.arduinoPort = port;
  arduino.setTarget(host, port);
  ledAPI.setTarget(host, port);
  try {
    saveRuntimeSettings();
    logger.info(`Arduino célgép módosítva: ${host}:${port}`);
    res.json({ success: true, arduinoIP: host, arduinoPort: port });
  } catch (error) {
    logger.error(`Arduino beállítás mentési hiba: ${error.message}`);
    res.status(500).json({ error: 'A beállítás mentése nem sikerült.' });
  }
});

// ========================= ARDUINO OTA FIRMWARE =========================

const firmwareUpdate = {
  state: 'idle',
  message: 'Nincs folyamatban firmware-frissítés.',
  startedAt: null,
  finishedAt: null,
  artifact: null,
  installedVersion: null
};

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'arduino-led-controller'
  };
  return headers;
}

function setFirmwareUpdate(state, message, extra = {}) {
  Object.assign(firmwareUpdate, { state, message, ...extra });
  logger.info(`Firmware OTA: ${state} - ${message}`);
}

function runProgram(command, args, timeout = 180000, binary = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false });
    const chunks = [];
    let outputSize = 0;
    const append = (chunk) => {
      if (outputSize >= 65536) return;
      const part = Buffer.from(chunk).subarray(0, 65536 - outputSize);
      chunks.push(part);
      outputSize += part.length;
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks);
      if (code === 0) return resolve(binary ? output : output.toString('utf8'));
      const detail = output.toString('utf8').trim() || `kilépési kód: ${code}${signal ? ` (${signal})` : ''}`;
      reject(new Error(detail.slice(0, 2000)));
    });
  });
}

async function getLatestFirmwareArtifact() {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.firmwareRepo)) throw new Error('A firmware-tároló neve hibás.');
  const base = `https://api.github.com/repos/${config.firmwareRepo}`;
  const response = await axios.get(`${base}/releases/tags/${encodeURIComponent(config.firmwareReleaseTag)}`, { headers: githubHeaders(), timeout: 20000 });
  const release = response.data;
  const binary = (release.assets || []).find((asset) => asset.name.endsWith('.ino.bin'));
  const checksum = (release.assets || []).find((asset) => asset.name.endsWith('.ino.bin.sha256'));
  if (!binary || !checksum) throw new Error('A nyilvános firmware-kiadás még nem tartalmaz teljes firmware-csomagot.');
  const releaseBody = String(release.body || '');
  const versionMatch = releaseBody.match(/Firmware verzió:\s*([0-9]+(?:\.[0-9]+){1,3})/i);
  const commitMatch = releaseBody.match(/Forrás commit:\s*([a-f0-9]{7,40})/i);
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

async function getFirmwareStatus() {
  let installedVersion = null;
  let arduinoOnline = false;
  let networkConfigStored = false;
  let availableFirmware = null;
  let firmwareLookupError = null;
  try {
    const status = await arduino.get('/api/status');
    installedVersion = status.firmwareVersion || null;
    networkConfigStored = status.networkConfigStored === true;
    arduinoOnline = true;
  } catch (error) {
    logger.warn(`Firmware állapot: Arduino nem elérhető: ${error.message}`);
  }
  try {
    availableFirmware = await getLatestFirmwareArtifact();
  } catch (error) {
    firmwareLookupError = error.message;
  }
  const toolReady = Boolean(config.otaPassword) && fs.existsSync(config.otaToolPath);
  return {
    ...firmwareUpdate,
    installedVersion,
    arduinoOnline,
    otaConfigured: toolReady && networkConfigStored,
    otaToolInstalled: fs.existsSync(config.otaToolPath),
    otaPasswordConfigured: Boolean(config.otaPassword),
    networkConfigStored,
    availableFirmware,
    firmwareLookupError,
    repository: config.firmwareRepo,
    releaseTag: config.firmwareReleaseTag
  };
}

async function downloadAndApplyFirmware() {
  const startedAt = new Date().toISOString();
  setFirmwareUpdate('checking', 'A GitHub firmware-csomag ellenőrzése…', { startedAt, finishedAt: null, artifact: null });
  if (!config.otaPassword) throw new Error('Hiányzik az OTA jelszó a helyi beállításokból.');
  if (!fs.existsSync(config.otaToolPath)) throw new Error('Az OTA feltöltőeszköz nincs telepítve ezen a rendszeren.');

  const artifact = await getLatestFirmwareArtifact();
  setFirmwareUpdate('downloading', 'A sikeresen lefordított firmware letöltése…', { artifact });
  await fs.ensureDir(config.firmwareDir);
  const binaryPath = path.join(config.firmwareDir, 'latest-arduino-firmware.bin');

  const download = await axios.get(artifact.downloadUrl, {
    headers: githubHeaders(), responseType: 'arraybuffer', maxRedirects: 5, timeout: 60000, maxContentLength: 16 * 1024 * 1024
  });
  const firmware = Buffer.from(download.data);
  if (firmware.length < 1024) throw new Error('A firmware-fájl túl kicsi vagy sérült.');
  const actual = crypto.createHash('sha256').update(firmware).digest('hex');
  const checksumResponse = await axios.get(artifact.checksumUrl, { headers: githubHeaders(), responseType: 'text', timeout: 20000 });
  const expected = String(checksumResponse.data).trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/i.test(expected) || actual.toLowerCase() !== expected.toLowerCase()) throw new Error('A nyilvános firmware ellenőrzőösszege hibás.');
  if (artifact.digest.startsWith('sha256:') && actual.toLowerCase() !== artifact.digest.slice(7).toLowerCase()) throw new Error('A GitHub firmware-digest ellenőrzése hibás.');
  await fs.writeFile(binaryPath, firmware, { mode: 0o600 });

  setFirmwareUpdate('uploading', 'Firmware átvitele az Arduino OTA szolgáltatására…', { artifact });
  await runProgram(config.otaToolPath, [
    '-address', String(config.arduinoIP), '-port', '65280', '-username', 'arduino',
    '-password', config.otaPassword, '-sketch', binaryPath, '-upload', '/sketch', '-b'
  ], 240000);
  setFirmwareUpdate('restarting', 'Az Arduino újraindul; várakozás az új firmware-re…', { artifact });
  setTimeout(async () => {
    try {
      const status = await arduino.get('/api/status');
      setFirmwareUpdate('success', `Firmware sikeresen telepítve: ${status.firmwareVersion || 'új verzió'}.`, {
        artifact, installedVersion: status.firmwareVersion || null, finishedAt: new Date().toISOString()
      });
    } catch (error) {
      setFirmwareUpdate('success', 'A feltöltés sikeres. Az Arduino még újraindulhat; frissítsd az állapotot rövidesen.', {
        artifact, finishedAt: new Date().toISOString()
      });
    }
  }, 8000);
}

app.get('/api/firmware/status', async (req, res) => {
  try {
    const status = await getFirmwareStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message || 'A firmware állapota nem kérhető le.' });
  }
});

app.post('/api/firmware/update', async (req, res) => {
  if (['checking', 'downloading', 'uploading', 'restarting'].includes(firmwareUpdate.state)) {
    return res.status(409).json({ error: 'Már folyamatban van firmware-frissítés.', state: firmwareUpdate.state });
  }
  if (!config.otaPassword || !fs.existsSync(config.otaToolPath)) {
    return res.status(503).json({ error: 'Az OTA frissítés nincs teljesen beállítva. Ellenőrizd az OTA jelszót és az OTA feltöltőeszközt.' });
  }
  try {
    const status = await arduino.get('/api/status');
    if (status.networkConfigStored !== true) {
      return res.status(409).json({ error: 'Az Arduino még nem mentette el a WiFi- és OTA-beállításait. USB-n töltsd fel egyszer a 3.1.0 vagy újabb firmware-t a saját secrets.h fájloddal.' });
    }
  } catch (error) {
    return res.status(503).json({ error: `Az Arduino nem érhető el a biztonságos OTA ellenőrzéséhez: ${error.message}` });
  }
  res.status(202).json({ success: true, message: 'A firmware-frissítés elindult.' });
  downloadAndApplyFirmware().catch((error) => {
    logger.error(`Firmware OTA hiba: ${error.message}`);
    setFirmwareUpdate('error', `A frissítés nem sikerült: ${error.message}`, { finishedAt: new Date().toISOString() });
  });
});

// Helyi (Macen tárolt) heti ütemezések.
app.get('/api/local-schedules', (req, res) => {
  res.json({ schedules: localSchedules });
});

// Kézi átvitel az Arduino belső EEPROM-jába. Siker után az ütemezés Proxmox
// nélkül, közvetlenül az Arduino órája alapján fut tovább.
app.post('/api/local-schedules/sync-arduino', async (req, res) => {
  try {
    const result = await syncSchedulesToArduino();
    audit(req, 'local_schedules_synced_to_arduino', { count: localSchedules.length });
    res.json({ success: true, count: localSchedules.length, result });
  } catch (error) {
    logger.error(`Arduino időzítés szinkron hiba: ${error.message}`);
    res.status(503).json({ error: `Az Arduino EEPROM-időzítőjének mentése nem sikerült: ${error.message}` });
  }
});

// Letölthető, hordozható mentés az összes heti időzítésről.
app.get('/api/local-schedules/export', (req, res) => {
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': 'attachment; filename="weekly-led-schedules.json"'
  });
  res.json({
    format: 'arduino-led-controller-schedules',
    version: 1,
    exportedAt: new Date().toISOString(),
    schedules: localSchedules
  });
});

// Visszatöltés előtt mindig készül egy helyi biztonsági másolat.
app.post('/api/local-schedules/import', (req, res) => {
  const imported = req.body && req.body.schedules;
  if (!Array.isArray(imported)) {
    return res.status(400).json({ error: 'A feltöltött fájl nem tartalmaz időzítéslistát.' });
  }
  if (imported.length > 1000) {
    return res.status(400).json({ error: 'Egyszerre legfeljebb 1000 időzítés tölthető fel.' });
  }

  const normalized = [];
  for (const entry of imported) {
    const validationError = validateLocalSchedule(entry || {});
    if (validationError) {
      return res.status(400).json({ error: `Érvénytelen feltöltött időzítés: ${validationError}` });
    }
    normalized.push({
      id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : uuidv4(),
      day: entry.day,
      time: entry.time,
      leds: entry.leds.map(led => ({
        id: led.id,
        enabled: led.enabled,
        brightness: led.brightness,
        effect: led.effect,
        speed: Number.isInteger(led.speed) ? led.speed : 50,
        color: led.color
      }))
    });
  }

  const backupFile = `weekly-led-schedules.backup-${Date.now()}.json`;
  try {
    fs.writeJsonSync(path.join(config.schedulesDir, backupFile), localSchedules, { spaces: 2 });
    localSchedules = normalized.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
    saveLocalSchedules();
    res.json({ success: true, count: localSchedules.length, backupFile });
  } catch (error) {
    logger.error(`Időzítés importálási hiba: ${error.message}`);
    res.status(500).json({ error: 'Az időzítések mentése nem sikerült.' });
  }
});

app.post('/api/local-schedules', (req, res) => {
  const schedule = req.body || {};
  const days = Array.isArray(schedule.days) ? schedule.days : [schedule.day];
  const uniqueDays = [...new Set(days.map(Number))];
  if (uniqueDays.length === 0) return res.status(400).json({ error: 'Legalább egy napot ki kell választani.' });

  const entries = [];
  for (const day of uniqueDays) {
    const validationError = validateLocalSchedule({ ...schedule, day });
    if (validationError) return res.status(400).json({ error: validationError });
    entries.push({
      id: uuidv4(),
      day,
      time: schedule.time,
      leds: schedule.leds.map(led => ({
        id: led.id,
        enabled: led.enabled,
        brightness: led.brightness,
        effect: led.effect,
        speed: Number.isInteger(led.speed) ? led.speed : 50,
        color: led.color
      }))
    });
  }
  localSchedules.push(...entries);
  localSchedules.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  saveLocalSchedules();
  res.status(201).json({ schedules: entries });
});

app.delete('/api/local-schedules/:id', (req, res) => {
  const previousCount = localSchedules.length;
  localSchedules = localSchedules.filter(schedule => schedule.id !== req.params.id);
  if (localSchedules.length === previousCount) return res.status(404).json({ error: 'Az ütemezés nem található.' });
  saveLocalSchedules();
  res.json({ success: true });
});

// Schedule test
app.post('/api/arduino/schedules/test', async (req, res) => {
  const { time } = req.body;
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return res.status(400).json({ 
      error: 'Az idő formátuma HH:MM legyen.', 
      code: 'INVALID_TIME' 
    });
  }
  try {
    const result = await arduino.get(`/api/schedule/test/${time}`);
    if (io) io.emit('scheduleTested', { time, result });
    res.json(result);
  } catch (error) {
    res.status(502).json({ error: error.message, code: 'ARDUINO_TIMEOUT' });
  }
});

// ========================= LOCAL FILE MANAGEMENT =========================

// File upload to Arduino (SD card)
app.post('/api/upload/schedule', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Nincs fájl feltöltve', 
        code: 'NO_FILE' 
      });
    }

    const filename = req.file.filename;
    const content = await fs.readFile(req.file.path, 'utf8');

    // Validate filename format
    if (!/^S[0-6]L[1-3]\.JS$/i.test(filename)) {
      return res.status(400).json({ 
        error: 'Érvénytelen ütemezésfájl-név. Formátum: S0-L1.JS', 
        code: 'INVALID_FILENAME' 
      });
    }

    // Validate JSON
    try {
      JSON.parse(content);
    } catch (parseError) {
      return res.status(400).json({ 
        error: 'Érvénytelen JSON formátum', 
        code: 'INVALID_JSON',
        details: parseError.message
      });
    }

    const result = await arduino.uploadFile(filename, content);

    logger.info(`Schedule uploaded: ${filename}`);
    if (io) io.emit('scheduleUploaded', { filename });

    res.json({
      success: true,
      message: 'Ütemezés sikeresen feltöltve SD kártyára',
      filename,
      result
    });
  } catch (error) {
    logger.error(`Schedule upload error:`, error);
    res.status(500).json({ 
      error: error.message, 
      code: 'UPLOAD_ERROR' 
    });
  }
});

// Local file list
app.get('/api/files', async (req, res) => {
  try {
    if (!fs.existsSync(config.schedulesDir)) {
      return res.status(404).json({ error: 'Schedules directory not found' });
    }

    const files = await fs.readdir(config.schedulesDir);
    const fileList = [];

    for (const file of files) {
      const filePath = path.join(config.schedulesDir, file);
      const stats = await fs.stat(filePath);
      fileList.push({
        name: file,
        size: stats.size,
        modified: stats.mtime,
        path: filePath
      });
    }

    res.json({ files: fileList });
  } catch (error) {
    res.status(500).json({ error: error.message, code: 'FILE_LIST_ERROR' });
  }
});

// ========================= WEBC UI ROUTES =========================

function renderControlDashboard() {
  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Arduino LED vezérlő</title>
<style>
:root{color-scheme:dark;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--bg:#07111f;--surface:#101e32cc;--edge:#294564;--text:#edf6ff;--muted:#9bb2c9;--blue:#38a5ff;--green:#45d49a;--red:#ff6378}*{box-sizing:border-box}body{min-height:100vh;margin:0;color:var(--text);background:radial-gradient(circle at 10% 0,#16446e 0,transparent 30rem),radial-gradient(circle at 100% 15%,#24366f 0,transparent 28rem),var(--bg)}.wrap{max-width:1200px;margin:auto;padding:36px 24px 48px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px;padding:24px 26px;border:1px solid #3a6384;border-radius:24px;background:linear-gradient(120deg,#102840d9,#172a52c7);box-shadow:0 24px 70px #0006}.top h1{margin:0 0 7px;font-size:clamp(1.65rem,4vw,2.25rem);letter-spacing:-.04em}.top h1::first-letter{color:#8bd0ff}.toolbar,.section-actions{display:flex;gap:10px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.card{background:linear-gradient(145deg,#12243bd9,#0d192ad9);border:1px solid var(--edge);border-radius:20px;padding:20px;box-shadow:0 16px 38px #0004;backdrop-filter:blur(10px)}.card h2{margin:0;font-size:1.2rem;letter-spacing:-.02em}.line{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:13px 0}.line label{color:#c8d9e9}.value{min-width:38px;text-align:right;color:#7bc4ff;font-weight:700}.switch{width:52px;height:30px;appearance:none;background:#526378;border:0;border-radius:20px;position:relative;cursor:pointer;transition:.2s}.switch:checked{background:var(--green)}.switch:before{content:"";position:absolute;width:22px;height:22px;border-radius:50%;background:#fff;top:4px;left:4px;transition:.2s;box-shadow:0 2px 5px #0004}.switch:checked:before{left:26px}input[type=range]{width:100%;accent-color:var(--blue)}input[type=color]{width:48px;height:34px;border:0;background:none;cursor:pointer}select,button,input[type=time]{font:inherit;border-radius:10px;border:1px solid #3a6384;padding:10px 12px}select,input[type=time]{background:#0b1727;color:#fff;flex:1}button{cursor:pointer;background:linear-gradient(135deg,#188ce5,#4771ec);color:#fff;font-weight:700;box-shadow:0 5px 15px #0d52a144;transition:transform .15s,filter .15s}button:hover{filter:brightness(1.13);transform:translateY(-1px)}button:disabled{opacity:.6;cursor:wait;transform:none}button.secondary{background:#1a344d;border-color:#416482}button.danger{background:linear-gradient(135deg,#cd4059,#ef5e72);border-color:#ef5e72}button.full{width:100%;margin-top:15px;padding:12px}.status{font-size:.85rem;color:var(--muted);min-height:1.2em}.notice{position:fixed;right:20px;bottom:20px;z-index:5;max-width:390px;padding:14px 16px;border-radius:12px;background:#123a5d;border:1px solid #58b4ff;box-shadow:0 12px 32px #0009;display:none}.notice.error{background:#592b39;border-color:#ff7485}.system{margin-top:20px}.muted{color:var(--muted);font-size:.9rem;line-height:1.5}.section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:16px;border-bottom:1px solid #27425e}.eyebrow{display:block;margin-bottom:5px;color:#70c2ff;font-size:.74rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.days{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0}.day-choice{display:flex;align-items:center;gap:6px;padding:8px;border:1px solid #294864;border-radius:10px;background:#0b1727;font-size:.88rem}.schedule-led{border-top:1px solid #29425d;padding-top:13px;margin-top:13px}.schedule-list{margin-top:18px}.schedule-item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:#091727;border:1px solid #284561;border-radius:12px;padding:12px;margin:9px 0}.schedule-item small{color:#c7d8e8;line-height:1.45}.schedule-item button{padding:7px 10px;font-size:.82rem}@media(max-width:700px){.top,.section-heading{align-items:flex-start;flex-direction:column}.wrap{padding:16px}.top{padding:20px}.days{grid-template-columns:repeat(2,1fr)}.schedule-item{align-items:flex-start;flex-direction:column}}
</style></head><body><main class="wrap"><div class="top"><div><h1>💡 Arduino LED vezérlő</h1><div class="muted">UNO R4 WiFi · <span id="connection">Kapcsolódás…</span></div></div><div class="toolbar"><button id="allOn">Összes be</button><button id="allOff" class="danger">Összes ki</button><button id="refresh" class="secondary">Frissítés</button></div></div><section class="grid" id="leds"></section><section class="card system"><div class="section-heading"><div><span class="eyebrow">Automatizálás</span><h2>📅 Heti időzítés</h2></div><div class="section-actions"><button id="exportSchedules" class="secondary">Letöltés</button><button id="importSchedules" class="secondary">Feltöltés</button><input id="scheduleImportFile" type="file" accept="application/json,.json" hidden></div></div><div class="line"><label>Idő</label><input id="scheduleTime" type="time" value="19:30"></div><div class="line"><label><input id="allScheduleDays" type="checkbox"> Összes nap kijelölése</label></div><div class="days"><label class="day-choice"><input class="schedule-day" type="checkbox" value="1"> Hétfő</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="2"> Kedd</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="3"> Szerda</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="4"> Csütörtök</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="5"> Péntek</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="6"> Szombat</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="7"> Vasárnap</label></div><div id="scheduleLedEditor"></div><button id="saveSchedule" class="full">Új időzítés mentése</button><p class="muted">Minden mentés új bejegyzést hoz létre, tehát egy naphoz több időpontot is hozzáadhatsz. A feltöltés a jelenlegi listát lecseréli, de előtte automatikusan mentést készít.</p><div class="schedule-list" id="scheduleList"></div></section><section class="card system"><span class="eyebrow">Élő információ</span><h2>Rendszerállapot</h2><div id="systemStatus" class="muted" style="margin-top:12px">Betöltés…</div></section></main><div class="notice" id="notice" role="status"></div>
<script>
const effects=['Statikus','Villogás','Lélegzés','Szivárvány','Futófény'];
const ledRoot=document.getElementById('leds');const notice=document.getElementById('notice');
const dayNames=['','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'];
const scheduleEditor=document.getElementById('scheduleLedEditor');
function scheduleLedRow(id){const row=document.createElement('div');row.className='schedule-led';row.dataset.id=id;row.innerHTML='<strong>LED '+id+'</strong><div class="line"><label>Művelet</label><select class="schedule-state"><option value="ignore">Nincs módosítás</option><option value="on">Bekapcsolás</option><option value="off">Kikapcsolás</option></select></div><div class="line"><label>Szín</label><input class="schedule-color" type="color" value="#0000ff"></div><div class="line"><label>Fényerő</label><span class="schedule-value">10</span></div><input class="schedule-brightness" type="range" min="0" max="255" value="10"><div class="line"><label>Effekt</label><select class="schedule-effect"></select></div>';const slider=row.querySelector('.schedule-brightness');slider.addEventListener('input',()=>row.querySelector('.schedule-value').textContent=slider.value);effects.forEach((name,index)=>row.querySelector('.schedule-effect').add(new Option(name,index)));return row}
scheduleEditor.replaceChildren(scheduleLedRow(1),scheduleLedRow(2),scheduleLedRow(3));
function hex(rgb){return '#'+rgb.map(v=>Number(v).toString(16).padStart(2,'0')).join('')}
function rgb(value){return [value.slice(1,3),value.slice(3,5),value.slice(5,7)].map(x=>parseInt(x,16))}
function message(text,error=false){notice.textContent=text;notice.className='notice'+(error?' error':'');notice.style.display='block';clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(()=>notice.style.display='none',5000)}
async function request(url,options={}){const response=await fetch(url,{headers:{'Content-Type':'application/json'},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Ismeretlen szerverhiba');return data}
function card(led){const el=document.createElement('article');el.className='card';el.dataset.id=led.id;el.innerHTML='<h2>LED szalag '+led.id+'</h2><div class="line"><label>Bekapcsolva</label><input class="switch enabled" type="checkbox"></div><div class="line"><label>Szín</label><input class="color" type="color"></div><div class="line"><label>Fényerő</label><span class="value"></span></div><input class="brightness" type="range" min="0" max="255"><div class="line"><label>Effekt</label><select class="effect"></select></div><button class="full apply">Beállítások elküldése</button><div class="status"></div>';el.querySelector('.enabled').checked=Boolean(led.enabled);el.querySelector('.color').value=hex(led.color||[255,255,255]);const slider=el.querySelector('.brightness');slider.value=led.brightness??100;el.querySelector('.value').textContent=slider.value;slider.addEventListener('input',()=>el.querySelector('.value').textContent=slider.value);const select=el.querySelector('.effect');effects.forEach((name,index)=>{const option=new Option(name,index);option.selected=Number(led.effect)===index;select.add(option)});el.querySelector('.apply').addEventListener('click',()=>apply(el));return el}
async function apply(cardEl){const id=Number(cardEl.dataset.id);const button=cardEl.querySelector('.apply');const status=cardEl.querySelector('.status');button.disabled=true;status.textContent='Küldés…';try{const data={enabled:cardEl.querySelector('.enabled').checked,brightness:Number(cardEl.querySelector('.brightness').value),effect:Number(cardEl.querySelector('.effect').value),color:rgb(cardEl.querySelector('.color').value)};await request('/api/arduino/led/'+id,{method:'POST',body:JSON.stringify(data)});status.textContent='✓ Beállítás elküldve';message('LED '+id+' beállítva');await load()}catch(error){status.textContent='✕ '+error.message;message('LED '+id+': '+error.message,true)}finally{button.disabled=false}}
async function all(state){try{await request('/api/arduino/'+(state?'all-on':'all-off'),{method:'POST'});message(state?'Minden LED bekapcsolva':'Minden LED kikapcsolva');await load()}catch(error){message(error.message,true)}}
function describeSchedule(schedule){return schedule.leds.map(led=>'LED '+led.id+' '+(led.enabled?'be':'ki')+' · '+led.brightness+' · RGB('+led.color.join(',')+')').join(' | ')}
async function loadSchedules(){try{const data=await request('/api/local-schedules');const list=document.getElementById('scheduleList');list.replaceChildren();if(!data.schedules.length){list.textContent='Még nincs mentett időzítés.';return}data.schedules.forEach(schedule=>{const row=document.createElement('div');row.className='schedule-item';const text=document.createElement('small');text.textContent=dayNames[schedule.day]+' '+schedule.time+' — '+describeSchedule(schedule);const remove=document.createElement('button');remove.className='danger';remove.textContent='Törlés';remove.addEventListener('click',async()=>{try{await request('/api/local-schedules/'+schedule.id,{method:'DELETE'});message('Időzítés törölve');loadSchedules()}catch(error){message(error.message,true)}});row.append(text,remove);list.append(row)})}catch(error){message('Időzítések: '+error.message,true)}}
async function saveSchedule(){const days=[...document.querySelectorAll('.schedule-day:checked')].map(input=>Number(input.value));const leds=[];document.querySelectorAll('.schedule-led').forEach(row=>{const state=row.querySelector('.schedule-state').value;if(state==='ignore')return;leds.push({id:Number(row.dataset.id),enabled:state==='on',brightness:Number(row.querySelector('.schedule-brightness').value),effect:Number(row.querySelector('.schedule-effect').value),color:rgb(row.querySelector('.schedule-color').value)})});try{const result=await request('/api/local-schedules',{method:'POST',body:JSON.stringify({days,time:document.getElementById('scheduleTime').value,leds})});message(result.schedules.length+' időzítés elmentve');loadSchedules()}catch(error){message(error.message,true)}}
async function exportSchedules(){try{const response=await fetch('/api/local-schedules/export');if(!response.ok)throw new Error('A letöltés nem sikerült.');const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='weekly-led-schedules.json';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);message('Időzítések letöltve')}catch(error){message(error.message,true)}}
async function importSchedules(file){if(!file)return;try{const content=await file.text();const data=JSON.parse(content);const result=await request('/api/local-schedules/import',{method:'POST',body:JSON.stringify(data)});message(result.count+' időzítés feltöltve. Biztonsági mentés: '+result.backupFile);loadSchedules()}catch(error){message('Feltöltési hiba: '+error.message,true)}finally{document.getElementById('scheduleImportFile').value=''}}
async function load(){document.getElementById('connection').textContent='Kapcsolódás…';try{const status=await request('/api/arduino/status');const strips=status.strips||[];ledRoot.replaceChildren(...strips.map(card));document.getElementById('connection').textContent='Arduino elérhető';document.getElementById('systemStatus').textContent='WiFi: '+(status.connected?'kapcsolódva':'nincs kapcsolat')+' · Idő: '+(status.timesynced?'szinkronizálva':'nincs szinkron')+' · SD: '+(status.sdCard?'elérhető':'nincs')+' · Uptime: '+(status.uptime??'?')+' mp';}catch(error){document.getElementById('connection').textContent='Kapcsolati hiba';ledRoot.replaceChildren();document.getElementById('systemStatus').textContent=error.message;message(error.message,true)}}
document.getElementById('allOn').addEventListener('click',()=>all(true));document.getElementById('allOff').addEventListener('click',()=>all(false));document.getElementById('refresh').addEventListener('click',load);document.getElementById('saveSchedule').addEventListener('click',saveSchedule);document.getElementById('exportSchedules').addEventListener('click',exportSchedules);document.getElementById('importSchedules').addEventListener('click',()=>document.getElementById('scheduleImportFile').click());document.getElementById('scheduleImportFile').addEventListener('change',event=>importSchedules(event.target.files[0]));document.getElementById('allScheduleDays').addEventListener('change',event=>document.querySelectorAll('.schedule-day').forEach(input=>input.checked=event.target.checked));document.querySelectorAll('.schedule-day').forEach(input=>input.addEventListener('change',()=>document.getElementById('allScheduleDays').checked=[...document.querySelectorAll('.schedule-day')].every(day=>day.checked)));load();loadSchedules();
</script></body></html>`;
}

// Modern, többnézetes kezelőfelület. A régi renderelő megmarad visszaesési
// lehetőségként, az alkalmazás ezt az új felületet szolgálja ki.
function renderControlDashboardV2() {
  return `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LED Control Center</title>
<style>
:root{color-scheme:dark;--bg:#15181c;--panel:#25282d;--panel2:#1d2025;--edge:#ffffff16;--text:#f4f5f6;--muted:#9ea4ac;--orange:#ff6b43;--green:#59cf83;--blue:#6e9fff;--red:#f06b7d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 80% -10%,#4c3c37 0,transparent 34rem),radial-gradient(circle at -15% 110%,#29394c 0,transparent 40rem),var(--bg);color:var(--text)}button,input,select{font:inherit}.app{max-width:1540px;min-height:100vh;margin:auto;display:grid;grid-template-columns:248px 1fr}.sidebar{padding:26px 16px;border-right:1px solid var(--edge);background:#15171ad9;backdrop-filter:blur(18px);position:sticky;top:0;height:100vh}.brand{display:flex;gap:11px;align-items:center;padding:0 10px 30px;font-size:1.05rem;font-weight:800}.brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:11px;background:linear-gradient(135deg,var(--orange),#ff9a57);box-shadow:0 9px 25px #ff6b4355}.brand small{display:block;color:var(--muted);font-size:.69rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.nav-label{padding:15px 11px 8px;color:#707780;font-size:.68rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase}.nav{display:grid;gap:5px}.nav button{border:0;background:transparent;color:#b8bdc4;text-align:left;padding:12px 13px;border-radius:12px;cursor:pointer;font-weight:650}.nav button:hover{background:#ffffff0b;color:#fff}.nav button.active{background:linear-gradient(90deg,#ff6b4330,#ff6b4310);color:#fff;box-shadow:inset 3px 0 var(--orange)}.side-foot{position:absolute;bottom:24px;left:24px;right:24px;border:1px solid var(--edge);border-radius:14px;padding:12px;color:var(--muted);font-size:.8rem}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 12px var(--green);margin-right:7px}.main{padding:28px 32px 48px;min-width:0}.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:28px}.crumb{color:var(--muted);font-size:.87rem}.topbar h1{font-size:1.7rem;margin:4px 0 0;letter-spacing:-.04em}.actions,.section-actions{display:flex;gap:9px;flex-wrap:wrap}button{border:1px solid var(--edge);border-radius:10px;padding:10px 13px;color:#fff;background:#31353b;font-weight:750;cursor:pointer;transition:.18s transform,.18s filter}button:hover{filter:brightness(1.14);transform:translateY(-1px)}button.primary{border-color:#ff825f;background:linear-gradient(135deg,var(--orange),#f45b3e)}button.danger{background:#582c37;border-color:#a94d5d}button.ghost{background:#ffffff0b}.view{display:none}.view.active{display:block}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.metric,.panel,.led-card{border:1px solid var(--edge);background:linear-gradient(145deg,#2b2e34e8,#202329e8);box-shadow:0 18px 46px #0003;border-radius:18px}.metric{padding:18px}.metric-label{display:flex;justify-content:space-between;color:var(--muted);font-size:.8rem}.metric strong{display:block;margin:10px 0 4px;font-size:1.7rem;letter-spacing:-.05em}.up{color:var(--green);font-size:.76rem;font-weight:750}.layout{display:grid;grid-template-columns:1.6fr .9fr;gap:18px;margin-top:18px}.panel{padding:20px}.panel h2{margin:0;font-size:1.05rem;letter-spacing:-.02em}.panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.muted{color:var(--muted);font-size:.86rem;line-height:1.5}.overview-leds{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.mini-led{padding:14px;border-radius:13px;background:#171a1f;border:1px solid var(--edge)}.mini-led b{display:block;margin-bottom:8px}.mini-dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#69717c;margin-right:6px}.mini-dot.on{background:var(--green);box-shadow:0 0 12px var(--green)}.activity{display:grid;gap:12px}.activity-item{display:flex;gap:10px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--edge)}.activity-item:last-child{border:0;padding:0}.activity-icon{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#ffffff0c}.chart{height:184px;display:flex;gap:13px;align-items:flex-end;padding:16px 4px 0;border-bottom:1px solid #ffffff25}.bar{flex:1;border-radius:8px 8px 0 0;background:linear-gradient(#ff915f,#ff6944);min-height:12px}.legend{display:flex;justify-content:space-between;margin-top:10px;color:var(--muted);font-size:.76rem}.led-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.led-card{padding:19px}.led-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.led-title h2{margin:0;font-size:1.08rem}.state{font-size:.75rem;color:var(--muted)}.line{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:13px 0}.line label{color:#c5c9ce;font-size:.9rem}.value{color:#ffad85;font-weight:800}.switch{width:50px;height:28px;appearance:none;border:0;background:#5a626c;border-radius:20px;position:relative;cursor:pointer}.switch:after{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:#fff;left:4px;top:4px;transition:.2s}.switch:checked{background:var(--green)}.switch:checked:after{left:26px}input[type=range]{width:100%;accent-color:var(--orange)}input[type=color]{width:45px;height:30px;border:0;background:transparent}select,input[type=time]{width:100%;padding:10px;border:1px solid #ffffff24;border-radius:9px;background:#171a1f;color:#fff}.apply{width:100%;margin-top:14px;background:linear-gradient(135deg,#f56e48,#fb8e58)}.status{min-height:1.2em;color:var(--muted);font-size:.8rem;margin-top:8px}.scheduler{max-width:900px}.days{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin:13px 0}.day-choice{display:flex;justify-content:center;gap:5px;align-items:center;padding:9px 5px;border:1px solid var(--edge);border-radius:9px;background:#191c21;font-size:.78rem}.schedule-led{margin-top:14px;padding-top:14px;border-top:1px solid var(--edge)}.schedule-list{display:grid;gap:8px;margin-top:18px}.schedule-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;border-radius:11px;background:#171a1f;border:1px solid var(--edge)}.schedule-item small{color:#c6cbd2}.console{background:#121417;border:1px solid var(--edge);border-radius:13px;padding:10px;min-height:420px;max-height:600px;overflow:auto;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace}.log{display:grid;grid-template-columns:80px 64px 1fr;gap:9px;padding:6px 4px;border-bottom:1px solid #ffffff0a;color:#cdd1d6}.log time{color:#8f98a2}.log-type{font-weight:800}.log.error .log-type{color:var(--red)}.log.warn .log-type{color:#ffbd5a}.log.success .log-type{color:var(--green)}.log.info .log-type{color:var(--blue)}.notice{display:none;position:fixed;right:22px;bottom:22px;z-index:9;max-width:420px;padding:13px 15px;background:#263845;border:1px solid #6492ad;border-radius:11px;box-shadow:0 16px 50px #0009}.notice.error{background:#542d38;border-color:#bd5f70}@media(max-width:1050px){.metrics{grid-template-columns:repeat(2,1fr)}.led-grid{grid-template-columns:1fr 1fr}.app{grid-template-columns:76px 1fr}.sidebar{padding:26px 10px}.brand span,.nav-label,.nav button span,.side-foot{display:none}.brand{padding-left:10px}.nav button{text-align:center;font-size:1.1rem}.main{padding:22px}}@media(max-width:680px){.app{display:block}.sidebar{position:static;height:auto;border-right:0;padding:13px;display:flex;align-items:center;gap:8px}.brand{padding:0}.nav{display:flex;flex:1}.nav button{padding:9px;flex:1}.main{padding:16px}.topbar{align-items:flex-start;flex-direction:column}.metrics,.led-grid,.layout{grid-template-columns:1fr}.days{grid-template-columns:repeat(2,1fr)}.log{grid-template-columns:62px 52px 1fr}}
</style></head><body><div class="app"><aside class="sidebar"><div class="brand"><div class="brand-mark">💡</div><span>LED Control<small>UNO R4 WiFi</small></span></div><div class="nav-label">Kezelőpult</div><nav class="nav"><button class="active" data-view="dashboard">⌂ <span>Áttekintés</span></button><button data-view="control">◉ <span>LED vezérlés</span></button><button data-view="schedule">◷ <span>Időzítések</span></button><button data-view="console">›_ <span>Arduino napló</span></button></nav><div class="side-foot"><span class="dot"></span><span id="sideConnection">Kapcsolódás…</span></div></aside><main class="main"><header class="topbar"><div><div class="crumb">Arduino LED Controller / <span id="viewName">Áttekintés</span></div><h1 id="pageTitle">Személyes vezérlőpult</h1></div><div class="actions"><button id="refresh" class="ghost">↻ Frissítés</button><button id="allOn" class="primary">Összes be</button><button id="allOff" class="danger">Összes ki</button></div></header>
<section class="view active" id="dashboard"><div class="metrics"><article class="metric"><div class="metric-label">Aktív LED-ek <span>◉</span></div><strong id="activeLedCount">—</strong><span class="up">Élő állapot</span></article><article class="metric"><div class="metric-label">WiFi jel <span>⌁</span></div><strong id="wifiSignal">—</strong><span class="up">Arduino kapcsolat</span></article><article class="metric"><div class="metric-label">Ütemezések <span>◷</span></div><strong id="scheduleCount">—</strong><span class="up">Heti bejegyzés</span></article><article class="metric"><div class="metric-label">Üzemidő <span>◌</span></div><strong id="uptime">—</strong><span class="up">Folyamatos működés</span></article></div><div class="layout"><section class="panel"><div class="panel-head"><div><h2>LED-ek pillanatképe</h2><div class="muted">Aktuális fényerő és állapot</div></div></div><div class="overview-leds" id="overviewLeds"></div><div class="chart" id="brightnessChart"></div><div class="legend"><span>LED 1</span><span>LED 2</span><span>LED 3</span></div></section><section class="panel"><div class="panel-head"><div><h2>Rendszerállapot</h2><div class="muted">Az Arduino által küldött adatok</div></div><span id="systemBadge" class="up">—</span></div><div id="systemStatus" class="activity"></div></section></div></section>
<section class="view" id="control"><div class="panel-head"><div><h2>LED vezérlés</h2><div class="muted">A módosítás csak a kártyán lévő gombbal kerül az Arduinohoz.</div></div></div><div class="led-grid" id="leds"></div></section>
<section class="view" id="schedule"><div class="panel scheduler"><div class="panel-head"><div><h2>Heti időzítés</h2><div class="muted">Több nap és több napi időpont is beállítható.</div></div><div class="section-actions"><button id="exportSchedules" class="ghost">Letöltés</button><button id="importSchedules" class="ghost">Feltöltés</button><input id="scheduleImportFile" type="file" accept="application/json,.json" hidden></div></div><div class="line"><label>Idő</label><input id="scheduleTime" type="time" value="19:30"></div><label class="muted"><input id="allScheduleDays" type="checkbox"> Összes nap kijelölése</label><div class="days"><label class="day-choice"><input class="schedule-day" type="checkbox" value="1">H</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="2">K</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="3">Sze</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="4">Cs</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="5">P</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="6">Szo</label><label class="day-choice"><input class="schedule-day" type="checkbox" value="7">V</label></div><div id="scheduleLedEditor"></div><button id="saveSchedule" class="primary" style="width:100%;margin-top:16px">Új időzítés mentése</button><div class="schedule-list" id="scheduleList"></div></div></section>
<section class="view" id="console"><div class="panel"><div class="panel-head"><div><h2>Arduino eseménynapló</h2><div class="muted">10 másodpercenként automatikusan frissül az Arduino API-járól.</div></div><div class="section-actions"><button id="refreshLogs" class="ghost">Napló frissítése</button><button id="clearLogs" class="danger">Napló törlése</button></div></div><div class="metrics" style="margin-bottom:16px"><article class="metric"><div class="metric-label">Naplóbejegyzések</div><strong id="logCount">—</strong></article><article class="metric"><div class="metric-label">Szabad memória</div><strong id="freeMemory">—</strong></article><article class="metric"><div class="metric-label">WiFi jel</div><strong id="consoleSignal">—</strong></article><article class="metric"><div class="metric-label">Konzol</div><strong id="consoleState">—</strong></article></div><div class="console" id="consoleLogs"><div class="muted">Napló betöltése…</div></div></div></section>
</main></div><div class="notice" id="notice" role="status"></div><script>
const effects=['Statikus','Villogás','Lélegzés','Szivárvány','Futófény'];const dayNames=['','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap'];const ledRoot=document.getElementById('leds'),notice=document.getElementById('notice'),scheduleEditor=document.getElementById('scheduleLedEditor');let latestStatus=null;
function msg(text,error){notice.textContent=text;notice.className='notice'+(error?' error':'');notice.style.display='block';clearTimeout(window.noticeTimer);window.noticeTimer=setTimeout(function(){notice.style.display='none'},5000)}
async function request(url,options){const response=await fetch(url,Object.assign({headers:{'Content-Type':'application/json'}},options||{}));const data=await response.json().catch(function(){return {}});if(!response.ok)throw new Error(data.error||'Ismeretlen szerverhiba');return data}
function hex(color){return '#'+(color||[255,255,255]).map(function(v){return Number(v).toString(16).padStart(2,'0')}).join('')}function rgb(value){return [value.slice(1,3),value.slice(3,5),value.slice(5,7)].map(function(v){return parseInt(v,16)})}function formatUptime(seconds){seconds=Number(seconds)||0;const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60);return h? h+' ó '+m+' p':m+' perc'}
function ledCard(led){const el=document.createElement('article');el.className='led-card';el.dataset.id=led.id;el.innerHTML='<div class="led-title"><div><h2>LED szalag '+led.id+'</h2><span class="state">Egyedi vezérlés</span></div><span class="mini-dot '+(led.enabled?'on':'')+'"></span></div><div class="line"><label>Bekapcsolva</label><input class="switch enabled" type="checkbox"></div><div class="line"><label>Szín</label><input class="color" type="color"></div><div class="line"><label>Fényerő</label><span class="value"></span></div><input class="brightness" type="range" min="0" max="255"><div class="line"><label>Effekt</label><select class="effect"></select></div><div class="line"><label>Effekt sebessége</label><span class="speed-value"></span></div><input class="speed" type="range" min="1" max="100"><button class="apply">Beállítások elküldése</button><div class="status"></div>';el.querySelector('.enabled').checked=!!led.enabled;el.querySelector('.color').value=hex(led.color);const slider=el.querySelector('.brightness');slider.value=led.brightness==null?100:led.brightness;el.querySelector('.value').textContent=slider.value;slider.addEventListener('input',function(){el.querySelector('.value').textContent=slider.value});const speed=el.querySelector('.speed');speed.value=led.speed==null?50:led.speed;el.querySelector('.speed-value').textContent=speed.value;speed.addEventListener('input',function(){el.querySelector('.speed-value').textContent=speed.value});effects.forEach(function(name,index){const option=new Option(name,index);option.selected=Number(led.effect)===index;el.querySelector('.effect').add(option)});el.querySelector('.apply').addEventListener('click',function(){applyLed(el)});return el}
async function applyLed(el){const id=Number(el.dataset.id),button=el.querySelector('.apply'),status=el.querySelector('.status');button.disabled=true;status.textContent='Küldés…';try{await request('/api/arduino/led/'+id,{method:'POST',body:JSON.stringify({enabled:el.querySelector('.enabled').checked,brightness:Number(el.querySelector('.brightness').value),effect:Number(el.querySelector('.effect').value),speed:Number(el.querySelector('.speed').value),color:rgb(el.querySelector('.color').value)})});status.textContent='✓ Beállítás elküldve';msg('LED '+id+' beállítva');loadStatus()}catch(error){status.textContent='✕ '+error.message;msg(error.message,true)}finally{button.disabled=false}}
function overview(strips,status){const active=strips.filter(function(x){return x.enabled}).length;document.getElementById('activeLedCount').textContent=active+' / '+strips.length;document.getElementById('wifiSignal').textContent=status.rssi!=null?status.rssi+' dBm':'—';document.getElementById('uptime').textContent=formatUptime(status.uptime);document.getElementById('overviewLeds').replaceChildren(...strips.map(function(led){const item=document.createElement('div');item.className='mini-led';item.innerHTML='<b>LED '+led.id+'</b><span class="mini-dot '+(led.enabled?'on':'')+'"></span>'+(led.enabled?'Bekapcsolva':'Kikapcsolva')+'<div class="muted" style="margin-top:8px">Fényerő: '+(led.brightness||0)+'</div>';return item}));const chart=document.getElementById('brightnessChart');chart.replaceChildren(...strips.map(function(led){const bar=document.createElement('div');bar.className='bar';bar.style.height=Math.max(7,Math.round((Number(led.brightness)||0)/255*100))+'%';bar.title='LED '+led.id+': '+(led.brightness||0);return bar}));document.getElementById('systemBadge').textContent=status.connected?'ONLINE':'NINCS KAPCSOLAT';document.getElementById('systemStatus').innerHTML='<div class="activity-item"><div class="activity-icon">⌁</div><div><b>WiFi kapcsolat</b><div class="muted">'+(status.connected?'Stabil kapcsolat az Arduinohoz':'Az Arduino nem elérhető')+'</div></div></div><div class="activity-item"><div class="activity-icon">◷</div><div><b>Időszinkron</b><div class="muted">'+(status.timesynced?'NTP idő szinkronizálva':'Nincs időszinkron')+'</div></div></div><div class="activity-item"><div class="activity-icon">▣</div><div><b>Időzítési motor</b><div class="muted">'+(status.scheduler==='server'?'Szerveres ütemezés aktív':'Helyi szerveres ütemezés aktív')+'</div></div></div>'}
async function loadStatus(){try{const status=await request('/api/arduino/status');latestStatus=status;const strips=status.strips||[];ledRoot.replaceChildren(...strips.map(ledCard));overview(strips,status);document.getElementById('sideConnection').textContent='Arduino elérhető'}catch(error){document.getElementById('sideConnection').textContent='Kapcsolati hiba';msg(error.message,true)}}
function scheduleLedRow(id){const row=document.createElement('div');row.className='schedule-led';row.dataset.id=id;row.innerHTML='<b>LED '+id+'</b><div class="line"><label>Művelet</label><select class="schedule-state"><option value="ignore">Nincs módosítás</option><option value="on">Bekapcsolás</option><option value="off">Kikapcsolás</option></select></div><div class="line"><label>Szín</label><input class="schedule-color" type="color" value="#0000ff"></div><div class="line"><label>Fényerő</label><span class="schedule-value">10</span></div><input class="schedule-brightness" type="range" min="0" max="255" value="10"><div class="line"><label>Effekt</label><select class="schedule-effect"></select></div>';const slider=row.querySelector('.schedule-brightness');slider.addEventListener('input',function(){row.querySelector('.schedule-value').textContent=slider.value});effects.forEach(function(name,index){row.querySelector('.schedule-effect').add(new Option(name,index))});return row}scheduleEditor.replaceChildren(scheduleLedRow(1),scheduleLedRow(2),scheduleLedRow(3));
function describeSchedule(schedule){return schedule.leds.map(function(led){return 'LED '+led.id+' '+(led.enabled?'be':'ki')+' · '+led.brightness+' · RGB('+led.color.join(',')+')'}).join(' | ')}async function loadSchedules(){try{const data=await request('/api/local-schedules');document.getElementById('scheduleCount').textContent=data.schedules.length;const list=document.getElementById('scheduleList');list.replaceChildren();if(!data.schedules.length){list.textContent='Még nincs mentett időzítés.';return}data.schedules.forEach(function(schedule){const row=document.createElement('div');row.className='schedule-item';const text=document.createElement('small');text.textContent=dayNames[schedule.day]+' '+schedule.time+' — '+describeSchedule(schedule);const remove=document.createElement('button');remove.className='danger';remove.textContent='Törlés';remove.addEventListener('click',async function(){try{await request('/api/local-schedules/'+schedule.id,{method:'DELETE'});msg('Időzítés törölve');loadSchedules()}catch(error){msg(error.message,true)}});row.append(text,remove);list.append(row)})}catch(error){msg('Időzítések: '+error.message,true)}}
async function saveSchedule(){const days=[...document.querySelectorAll('.schedule-day:checked')].map(function(input){return Number(input.value)}),leds=[];document.querySelectorAll('.schedule-led').forEach(function(row){const state=row.querySelector('.schedule-state').value;if(state==='ignore')return;leds.push({id:Number(row.dataset.id),enabled:state==='on',brightness:Number(row.querySelector('.schedule-brightness').value),effect:Number(row.querySelector('.schedule-effect').value),color:rgb(row.querySelector('.schedule-color').value)})});try{const result=await request('/api/local-schedules',{method:'POST',body:JSON.stringify({days:days,time:document.getElementById('scheduleTime').value,leds:leds})});msg(result.schedules.length+' időzítés elmentve');loadSchedules()}catch(error){msg(error.message,true)}}
async function exportSchedules(){try{const response=await fetch('/api/local-schedules/export');if(!response.ok)throw new Error('A letöltés nem sikerült.');const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='weekly-led-schedules.json';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);msg('Időzítések letöltve')}catch(error){msg(error.message,true)}}async function importSchedules(file){if(!file)return;try{const data=JSON.parse(await file.text()),result=await request('/api/local-schedules/import',{method:'POST',body:JSON.stringify(data)});msg(result.count+' időzítés feltöltve');loadSchedules()}catch(error){msg('Feltöltési hiba: '+error.message,true)}finally{document.getElementById('scheduleImportFile').value=''}}
async function loadLogs(){try{const results=await Promise.all([request('/api/arduino/console/logs'),request('/api/arduino/console/stats')]);const logs=Array.isArray(results[0])?results[0]:(results[0].logs||[]),stats=results[1]||{};document.getElementById('logCount').textContent=stats.logCount==null?logs.length:stats.logCount;document.getElementById('freeMemory').textContent=stats.freeMemory==null?'—':stats.freeMemory+' B';document.getElementById('consoleSignal').textContent=stats.wifiSignal==null?'—':stats.wifiSignal+' dBm';document.getElementById('consoleState').textContent=stats.system&&stats.system.consoleActive?'Aktív':'—';const root=document.getElementById('consoleLogs');root.replaceChildren();if(!logs.length){root.textContent='Nincs naplóbejegyzés.';return}logs.slice(-100).reverse().forEach(function(log){const row=document.createElement('div');row.className='log '+(log.type||'info');const time=document.createElement('time'),type=document.createElement('span'),message=document.createElement('span');time.textContent=log.timestamp||'—';type.className='log-type';type.textContent=(log.type||'info').toUpperCase();message.textContent=log.message||String(log);row.append(time,type,message);root.append(row)})}catch(error){document.getElementById('consoleLogs').textContent='A napló jelenleg nem érhető el: '+error.message}}
function setView(name){document.querySelectorAll('.view').forEach(function(view){view.classList.toggle('active',view.id===name)});document.querySelectorAll('.nav button').forEach(function(button){button.classList.toggle('active',button.dataset.view===name)});const titles={dashboard:['Áttekintés','Személyes vezérlőpult'],control:['LED vezérlés','LED szalagok kezelése'],schedule:['Időzítések','Automatizálási rend'],console:['Arduino napló','Élő rendszeresemények']};document.getElementById('viewName').textContent=titles[name][0];document.getElementById('pageTitle').textContent=titles[name][1];if(name==='console')loadLogs()}
document.querySelectorAll('.nav button').forEach(function(button){button.addEventListener('click',function(){setView(button.dataset.view)})});document.getElementById('refresh').addEventListener('click',function(){loadStatus();loadSchedules();loadLogs()});document.getElementById('allOn').addEventListener('click',async function(){try{await request('/api/arduino/all-on',{method:'POST'});msg('Minden LED bekapcsolva');loadStatus()}catch(error){msg(error.message,true)}});document.getElementById('allOff').addEventListener('click',async function(){try{await request('/api/arduino/all-off',{method:'POST'});msg('Minden LED kikapcsolva');loadStatus()}catch(error){msg(error.message,true)}});document.getElementById('saveSchedule').addEventListener('click',saveSchedule);document.getElementById('exportSchedules').addEventListener('click',exportSchedules);document.getElementById('importSchedules').addEventListener('click',function(){document.getElementById('scheduleImportFile').click()});document.getElementById('scheduleImportFile').addEventListener('change',function(event){importSchedules(event.target.files[0])});document.getElementById('allScheduleDays').addEventListener('change',function(event){document.querySelectorAll('.schedule-day').forEach(function(input){input.checked=event.target.checked})});document.querySelectorAll('.schedule-day').forEach(function(input){input.addEventListener('change',function(){document.getElementById('allScheduleDays').checked=[...document.querySelectorAll('.schedule-day')].every(function(day){return day.checked})})});document.getElementById('refreshLogs').addEventListener('click',loadLogs);document.getElementById('clearLogs').addEventListener('click',async function(){try{await request('/api/arduino/console/clear',{method:'POST'});msg('Arduino napló törölve');loadLogs()}catch(error){msg(error.message,true)}});loadStatus();loadSchedules();loadLogs();setInterval(loadStatus,30000);setInterval(loadLogs,10000);
</script></body></html>`;
}

// A kapcsolat célcíme a felületből bármikor átállítható.  Ezt külön, a
// beágyazott kezelőfelület után tesszük hozzá, hogy az eredeti nagy sablon
// áttekinthető maradjon.
function renderConfiguredDashboard() {
  return renderControlDashboardV2().replace('</body>', `<script>
  (function () {
    const nav = document.querySelector('.nav');
    const main = document.querySelector('.main');
    if (!nav || !main) return;

    const navButton = document.createElement('button');
    navButton.dataset.view = 'settings';
    navButton.innerHTML = '⚙ <span>Konfiguráció</span>';
    nav.append(navButton);

    const section = document.createElement('section');
    section.className = 'view';
    section.id = 'settings';
    section.innerHTML = '<div class="panel scheduler"><div class="panel-head"><div><h2>Kapcsolati beállítások</h2><div class="muted">Itt állíthatod át, melyik Arduino vezérlőt használja a szerver.</div></div></div><div class="line"><label>Arduino IP-címe vagy neve</label><input id="settingsArduinoIP" type="text" inputmode="url" placeholder="például: 10.0.0.117"></div><div class="line"><label>Arduino port</label><input id="settingsArduinoPort" type="number" min="1" max="65535" value="80"></div><button id="saveArduinoSettings" class="primary" style="width:100%;margin-top:10px">Kapcsolat mentése</button><p id="settingsConnection" class="muted">A mentett cím betöltése…</p><div class="schedule-led"><div class="panel-head"><div><h2>Arduino firmware</h2><div class="muted">A GitHubon sikeresen lefordított firmware biztonságos OTA telepítése.</div></div></div><button id="checkFirmware" class="ghost">Frissítés ellenőrzése</button><button id="startFirmwareUpdate" class="primary" style="margin-left:8px">Firmware telepítése</button><p id="firmwareState" class="muted">Firmware állapot betöltése…</p></div></div>';
    main.append(section);

    if (window.desktopApp) {
      const desktopOtaPanel = document.createElement('div');
      desktopOtaPanel.className = 'schedule-led';
      desktopOtaPanel.innerHTML = '<div class="panel-head"><div><h2>Asztali alkalmazás · OTA jelszó</h2><div class="muted">Az Arduino secrets.h fájljában megadott jelszó. A rendszer titkosított tárhelyén marad, nem kerül GitHubra.</div></div></div><div class="line"><label>OTA jelszó</label><input id="desktopOtaPassword" type="password" minlength="12" autocomplete="new-password" placeholder="Legalább 12 karakter"></div><button id="saveDesktopOtaPassword" class="primary">OTA jelszó biztonságos mentése</button><p id="desktopOtaState" class="muted"></p>';
      section.querySelector('.panel.scheduler').append(desktopOtaPanel);
      const state = desktopOtaPanel.querySelector('#desktopOtaState');
      window.desktopApp.otaStatus().then(function (info) { state.textContent = info.configured ? '✓ OTA jelszó titkosítva mentve ezen a gépen.' : 'Az OTA firmware-frissítéshez add meg a jelszót.'; }).catch(function () { state.textContent = 'A titkosított tároló nem érhető el.'; });
      desktopOtaPanel.querySelector('#saveDesktopOtaPassword').addEventListener('click', async function () {
        const password = desktopOtaPanel.querySelector('#desktopOtaPassword').value;
        try { await window.desktopApp.saveOtaPassword(password); desktopOtaPanel.querySelector('#desktopOtaPassword').value = ''; state.textContent = '✓ OTA jelszó biztonságosan elmentve.'; msg('OTA jelszó elmentve'); loadFirmwareStatus(); }
        catch (error) { state.textContent = 'Mentési hiba: ' + error.message; msg(error.message, true); }
      });
    }

    const controlSection = document.getElementById('control');
    const testPanel = document.createElement('div');
    testPanel.className = 'panel';
    testPanel.style.marginBottom = '18px';
    testPanel.innerHTML = '<div class="panel-head"><div><h2>LED teszt és effektek</h2><div class="muted">Gyors ellenőrzés mindhárom szalagon. A teszt ideiglenesen felülírja az aktuális kézi LED-beállítást.</div></div></div><div class="section-actions"><button class="ghost" data-led-preset="night">🌙 Éjszakai kék</button><button class="ghost" data-led-preset="rainbow">🌈 Szivárvány teszt</button><button class="ghost" data-led-preset="pulse">✨ Lélegző teszt</button><button class="danger" data-led-preset="off">■ Teszt leállítása</button></div><p id="ledTestState" class="muted" style="margin:14px 0 0">Válassz egy mintát a LED-ek és a kapcsolat gyors ellenőrzéséhez.</p>';
    if (controlSection) controlSection.prepend(testPanel);

    const schedulePanel = document.getElementById('schedule');
    const scheduleActions = schedulePanel && schedulePanel.querySelector('.section-actions');
    if (scheduleActions) {
      const syncButton = document.createElement('button');
      syncButton.id = 'syncArduinoSchedules';
      syncButton.className = 'primary';
      syncButton.textContent = 'Mentés az Arduino-ba';
      scheduleActions.prepend(syncButton);
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent = 'Módosítás, törlés vagy feltöltés után kattints a „Mentés az Arduino-ba” gombra. Ettől a heti program Proxmox nélkül is fut tovább.';
      schedulePanel.querySelector('.schedule-list').before(hint);
      syncButton.addEventListener('click', async function () {
        syncButton.disabled = true; syncButton.textContent = 'Arduino mentése…';
        try {
          const result = await request('/api/local-schedules/sync-arduino', { method: 'POST' });
          msg(result.count + ' időzítés elmentve az Arduino belső tárhelyére.');
          loadStatus(); loadLogs();
        } catch (error) { msg('Arduino mentési hiba: ' + error.message, true); }
        finally { syncButton.disabled = false; syncButton.textContent = 'Mentés az Arduino-ba'; }
      });
    }
    const accessPanel = document.createElement('div');
    accessPanel.className = 'panel scheduler';
    accessPanel.style.marginTop = '18px';
    accessPanel.innerHTML = '<div class="panel-head"><div><h2>Felhasználók és szervernapló</h2><div id="currentUser" class="muted">Felhasználói adatok betöltése…</div></div><button id="logout" class="danger">Kijelentkezés</button></div><div id="adminArea" hidden><div class="schedule-led"><b>Új felhasználó</b><div class="line"><label>Név</label><input id="newUserName" type="text" placeholder="például: anna"></div><div class="line"><label>Jelszó</label><input id="newUserPassword" type="password" minlength="12"></div><div class="line"><label>Jogosultság</label><select id="newUserRole"><option value="viewer">Megtekintő</option><option value="operator" selected>Kezelő</option><option value="admin">Adminisztrátor</option></select></div><button id="createUser" class="primary">Felhasználó létrehozása</button><div id="userList" class="schedule-list"></div></div><div class="schedule-led"><div class="panel-head"><div><b>Szervernapló</b><div class="muted">Belépések és végrehajtott műveletek.</div></div><button id="loadAudit" class="ghost">Napló frissítése</button></div><div id="auditList" class="console" style="min-height:160px;max-height:340px">Adminisztrátori jogosultság szükséges.</div></div></div>';
    section.append(accessPanel);

    async function loadSettings() {
      const state = document.getElementById('settingsConnection');
      try {
        const data = await request('/api/settings');
        document.getElementById('settingsArduinoIP').value = data.arduinoIP || '';
        document.getElementById('settingsArduinoPort').value = data.arduinoPort || 80;
        state.textContent = 'Jelenlegi cél: ' + data.arduinoIP + ':' + data.arduinoPort;
      } catch (error) {
        state.textContent = 'A beállítás nem tölthető be: ' + error.message;
      }
    }

    async function saveSettings() {
      const state = document.getElementById('settingsConnection');
      const button = document.getElementById('saveArduinoSettings');
      button.disabled = true;
      state.textContent = 'Mentés és kapcsolatváltás…';
      try {
        const data = await request('/api/settings/arduino', {
          method: 'PUT',
          body: JSON.stringify({
            arduinoIP: document.getElementById('settingsArduinoIP').value.trim(),
            arduinoPort: Number(document.getElementById('settingsArduinoPort').value)
          })
        });
        state.textContent = 'Mentve. Új cél: ' + data.arduinoIP + ':' + data.arduinoPort;
        msg('Az Arduino címe elmentve');
        loadStatus();
      } catch (error) {
        state.textContent = 'Mentési hiba: ' + error.message;
        msg(error.message, true);
      } finally {
        button.disabled = false;
      }
    }

    function showFirmwareState(data) {
      const state = document.getElementById('firmwareState');
      const button = document.getElementById('startFirmwareUpdate');
      const installed = data.installedVersion ? 'Telepített verzió: ' + data.installedVersion + '. ' : '';
      const available = data.availableFirmware ? 'GitHub csomag: ' + (data.availableFirmware.firmwareVersion ? 'v' + data.availableFirmware.firmwareVersion + ' · ' : '') + data.availableFirmware.commit.slice(0, 7) + '. ' : '';
      const updateAvailable = Boolean(data.availableFirmware && data.availableFirmware.firmwareVersion && data.installedVersion && data.availableFirmware.firmwareVersion !== data.installedVersion);
      const busy = ['checking', 'downloading', 'uploading', 'restarting'].indexOf(data.state) >= 0;
      button.disabled = busy || !data.otaConfigured;
      if (!data.otaConfigured) {
        const reason = !data.otaPasswordConfigured ? 'hiányzik az OTA jelszó a Proxmox beállításaiból.' : !data.otaToolInstalled ? 'hiányzik az OTA feltöltőeszköz.' : !data.arduinoOnline ? 'az Arduino nem érhető el.' : 'előbb USB-n töltsd fel a 3.1.0 vagy újabb firmware-t a saját secrets.h fájloddal, hogy az Arduino elmentse a hálózati beállításait.';
        state.textContent = installed + available + 'Az OTA frissítés még nincs kész: ' + reason;
        return;
      }
      const idleMessage = updateAvailable ? 'Új firmware érhető el, telepítésre kész.' : 'A telepített firmware naprakész.';
      state.textContent = installed + available + (data.state === 'idle' ? idleMessage : data.message || data.firmwareLookupError || 'Készen áll a frissítésre.');
      if (busy) window.setTimeout(loadFirmwareStatus, 3000);
    }

    async function loadFirmwareStatus() {
      try {
        showFirmwareState(await request('/api/firmware/status'));
      } catch (error) {
        document.getElementById('firmwareState').textContent = 'A firmware állapota nem kérhető le: ' + error.message;
      }
    }

    async function startFirmwareUpdate() {
      if (!window.confirm('Biztosan telepíted a GitHubon lévő legutóbbi, sikeresen lefordított firmware-t az Arduino eszközre?')) return;
      try {
        await request('/api/firmware/update', { method: 'POST' });
        document.getElementById('firmwareState').textContent = 'A firmware-frissítés elindult…';
        msg('Firmware-frissítés elindítva');
        window.setTimeout(loadFirmwareStatus, 1000);
      } catch (error) {
        msg(error.message, true);
        loadFirmwareStatus();
      }
    }

    const ledPresets = {
      night: { label: 'Éjszakai kék', enabled: true, brightness: 18, effect: 0, speed: 50, color: [0, 25, 255] },
      rainbow: { label: 'Szivárvány teszt', enabled: true, brightness: 70, effect: 3, speed: 65, color: [255, 255, 255] },
      pulse: { label: 'Lélegző teszt', enabled: true, brightness: 85, effect: 2, speed: 40, color: [75, 130, 255] }
    };
    async function runLedPreset(name) {
      const state = document.getElementById('ledTestState');
      const buttons = Array.from(testPanel.querySelectorAll('button'));
      buttons.forEach(function (button) { button.disabled = true; });
      try {
        if (name === 'off') {
          await request('/api/arduino/all-off', { method: 'POST' });
          state.textContent = 'Teszt leállítva: mindhárom LED kikapcsolva.';
          msg('LED teszt leállítva');
        } else {
          const preset = ledPresets[name];
          state.textContent = preset.label + ' elküldése mindhárom LED-re…';
          for (let id = 1; id <= 3; id++) {
            await request('/api/arduino/led/' + id, { method: 'POST', body: JSON.stringify(preset) });
          }
          state.textContent = '✓ ' + preset.label + ' aktív mindhárom LED-en.';
          msg(preset.label + ' elindítva');
        }
        loadStatus();
      } catch (error) {
        state.textContent = 'Teszt hiba: ' + error.message;
        msg(error.message, true);
      } finally {
        buttons.forEach(function (button) { button.disabled = false; });
      }
    }

    function displayAudit(entries) {
      const root = document.getElementById('auditList');
      root.replaceChildren();
      if (!entries.length) { root.textContent = 'Még nincs naplóbejegyzés.'; return; }
      entries.forEach(function (entry) {
        const row = document.createElement('div'); row.className = 'log info';
        const time = document.createElement('time'), user = document.createElement('span'), text = document.createElement('span');
        time.textContent = entry.timestamp ? new Date(entry.timestamp).toLocaleString('hu-HU') : '—';
        user.className = 'log-type'; user.textContent = entry.user || '—';
        text.textContent = entry.action + (entry.details && entry.details.status ? ' · HTTP ' + entry.details.status : '');
        row.append(time, user, text); root.append(row);
      });
    }
    async function loadAccess() {
      try {
        const status = await request('/api/auth/status');
        document.getElementById('currentUser').textContent = 'Bejelentkezve: ' + status.user.displayName + ' · ' + status.user.role;
        const admin = status.user.role === 'admin'; document.getElementById('adminArea').hidden = !admin;
        if (!admin) return;
        const users = await request('/api/auth/users'), list = document.getElementById('userList'); list.replaceChildren();
        users.users.forEach(function (user) { const item = document.createElement('div'); item.className = 'schedule-item'; item.textContent = user.displayName + ' (' + user.username + ') · ' + user.role; list.append(item); });
        const auditData = await request('/api/auth/audit'); displayAudit(auditData.entries);
      } catch (error) { document.getElementById('currentUser').textContent = 'A belépési adatok nem tölthetők be.'; }
    }
    async function createUser() {
      try {
        const data = await request('/api/auth/users', { method: 'POST', body: JSON.stringify({ username:document.getElementById('newUserName').value, displayName:document.getElementById('newUserName').value, password:document.getElementById('newUserPassword').value, role:document.getElementById('newUserRole').value }) });
        document.getElementById('newUserPassword').value = ''; msg('Felhasználó létrehozva: ' + data.user.username); loadAccess();
      } catch (error) { msg(error.message, true); }
    }
    async function logout() { await request('/api/auth/logout', { method: 'POST' }); location.reload(); }

    function showSettings() {
      document.querySelectorAll('.view').forEach(function (view) { view.classList.toggle('active', view.id === 'settings'); });
      document.querySelectorAll('.nav button').forEach(function (button) { button.classList.toggle('active', button === navButton); });
      document.getElementById('viewName').textContent = 'Konfiguráció';
      document.getElementById('pageTitle').textContent = 'Kapcsolati beállítások';
      loadSettings();
      loadFirmwareStatus();
      loadAccess();
    }

    navButton.addEventListener('click', showSettings);
    document.getElementById('saveArduinoSettings').addEventListener('click', saveSettings);
    document.getElementById('checkFirmware').addEventListener('click', loadFirmwareStatus);
    document.getElementById('startFirmwareUpdate').addEventListener('click', startFirmwareUpdate);
    document.getElementById('createUser').addEventListener('click', createUser);
    document.getElementById('loadAudit').addEventListener('click', loadAccess);
    document.getElementById('logout').addEventListener('click', logout);
    testPanel.querySelectorAll('[data-led-preset]').forEach(function (button) {
      button.addEventListener('click', function () { runLedPreset(button.dataset.ledPreset); });
    });
  }());
  </script></body>`);
}

function renderLoginPage(setupNeeded) {
  const title = setupNeeded ? 'Első adminisztrátor létrehozása' : 'Bejelentkezés';
  const helper = setupNeeded ? 'Ez lesz a rendszer adminisztrátori fiókja.' : 'Jelentkezz be a LED vezérlő használatához.';
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · LED Control</title><style>:root{font-family:Inter,system-ui,sans-serif;color:#f4f5f6;background:#15181c}*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;background:radial-gradient(circle at 75% 0,#553d36,transparent 35rem),#15181c}.card{width:min(430px,calc(100vw - 32px));padding:30px;border:1px solid #ffffff18;border-radius:20px;background:#24272dee;box-shadow:0 24px 70px #0008}.mark{font-size:2rem}h1{margin:12px 0 6px;font-size:1.45rem}.muted{color:#a8aeb7;line-height:1.5}label{display:grid;gap:7px;margin-top:16px;font-size:.9rem}input,select{padding:12px;border:1px solid #ffffff25;border-radius:10px;background:#15181c;color:#fff;font:inherit}button{width:100%;margin-top:22px;padding:12px;border:0;border-radius:10px;background:linear-gradient(135deg,#ff6b43,#f45b3e);color:#fff;font-weight:800;cursor:pointer}.message{min-height:1.3em;margin-top:14px;color:#ffb0a0;font-size:.88rem}.secure{margin-top:20px;color:#8e96a1;font-size:.78rem}</style></head><body><main class="card"><div class="mark">💡</div><h1>${title}</h1><p class="muted">${helper}</p><form id="authForm"><label>Felhasználónév<input id="username" autocomplete="username" required minlength="3" pattern="[A-Za-z0-9._-]+"></label>${setupNeeded ? '<label>Megjelenő név<input id="displayName" autocomplete="name"></label>' : ''}<label>Jelszó<input id="password" type="password" autocomplete="${setupNeeded ? 'new-password' : 'current-password'}" required minlength="12"></label>${setupNeeded ? '<label>Jelszó ismétlése<input id="passwordConfirm" type="password" autocomplete="new-password" required minlength="12"></label>' : ''}<button>${setupNeeded ? 'Adminisztrátor létrehozása' : 'Belépés'}</button><div id="message" class="message"></div></form><p class="secure">A munkamenet 12 óráig érvényes. HTTPS használata ajánlott.</p></main><script>const setup=${setupNeeded ? 'true' : 'false'};document.getElementById('authForm').addEventListener('submit',async function(event){event.preventDefault();const message=document.getElementById('message'),password=document.getElementById('password').value;if(setup&&password!==document.getElementById('passwordConfirm').value){message.textContent='A két jelszó nem egyezik.';return}try{const response=await fetch(setup?'/api/auth/setup':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value,password:password,displayName:setup?document.getElementById('displayName').value:undefined})}),data=await response.json();if(!response.ok)throw new Error(data.error||'Sikertelen művelet');location.reload()}catch(error){message.textContent=error.message}});</script></body></html>`;
}

// Main dashboard
app.get('/', async (req, res) => {
  if (!sessionUser(req)) return res.type('html').send(renderLoginPage(authData.users.length === 0));
  // A kezelőfelület azonnal töltődjön be akkor is, ha az Arduino épp lassan
  // válaszol. Az állapotot a böngésző külön kéréssel frissíti.
  return res.type('html').send(renderConfiguredDashboard());

  try {
    const status = await arduino.get('/api/status');
    return res.type('html').send(renderControlDashboard());
    
    if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
      res.send(`
        <!DOCTYPE html>
        <html lang="hu">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Arduino LED Vezérlő</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 2em;
              margin-bottom: 10px;
            }
            .status-bar {
              display: flex;
              justify-content: center;
              gap: 20px;
              margin-top: 15px;
            }
            .status-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 15px;
              background: rgba(255,255,255,0.2);
              border-radius: 20px;
            }
            .status-icon {
              font-size: 1.5em;
            }
            .status-content {
              font-size: 0.9em;
            }
            .status-content strong {
              color: #ffd700;
            }
            .content {
              padding: 30px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-card {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 15px;
              border-left: 4px solid #667eea;
            }
            .info-card h3 {
              color: #667eea;
              margin-bottom: 10px;
              font-size: 1.2em;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e9ecef;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              color: #6c757d;
              font-weight: 500;
            }
            .info-value {
              font-weight: 600;
              color: #212529;
            }
            .api-section {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              margin-bottom: 20px;
            }
            .api-section h2 {
              color: #667eea;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #667eea;
            }
            .api-endpoint {
              background: white;
              padding: 12px 15px;
              border-radius: 10px;
              margin: 8px 0;
              border-left: 3px solid #28a745;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .api-endpoint.disabled {
              border-left-color: #dc3545;
              opacity: 0.6;
            }
            .endpoint-icon {
              font-size: 1.2em;
            }
            .endpoint-url {
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
              color: #495057;
              flex: 1;
            }
            .endpoint-desc {
              font-size: 0.85em;
              color: #6c757d;
            }
            .method-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 0.75em;
              font-weight: 700;
              text-transform: uppercase;
            }
            .method-get {
              background: #d4edda;
              color: #155724;
            }
            .method-post {
              background: #f8d7da;
              color: #721c24;
            }
            .method-put {
              background: #cce5ff;
              color: #004085;
            }
            .method-delete {
              background: #fff3cd;
              color: #856404;
            }
            .console-section {
              background: #2d2d2d;
              padding: 20px;
              border-radius: 15px;
              margin-top: 20px;
            }
            .console-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            }
            .console-title {
              color: white;
              font-size: 1.1em;
            }
            .console-actions {
              display: flex;
              gap: 10px;
            }
            .btn {
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.3s ease;
            }
            .btn-primary {
              background: #667eea;
              color: white;
            }
            .btn-danger {
              background: #dc3545;
              color: white;
            }
            .btn-warning {
              background: #ffc107;
              color: #212529;
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .console-output {
              background: #1a1a1a;
              color: #00ff00;
              padding: 15px;
              border-radius: 8px;
              font-family: 'Courier New', monospace;
              font-size: 0.85em;
              max-height: 300px;
              overflow-y: auto;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #e9ecef;
            }
            .footer p {
              color: #6c757d;
              font-size: 0.9em;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .online {
              animation: pulse 2s infinite;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 Arduino LED Vezérlő</h1>
              <p>Webes kezelőfelület Arduino UNO R4 WiFi + LED szalagok + Ütemezés</p>
              <div class="status-bar">
                <div class="status-item">
                  <span class="status-icon" id="wifiStatus">📡</span>
                  <div class="status-content">
                    <div id="wifiText">Kapcsolódás...</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">WiFi</div>
                  </div>
                </div>
                <div class="status-item">
                  <span class="status-icon" id="timeStatus">🕐</span>
                  <div class="status-content">
                    <div id="timeText">Idő szinkronizálás...</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">Idő</div>
                  </div>
                </div>
                <div class="status-item">
                  <span class="status-icon" id="sdStatus">💾</span>
                  <div class="status-content">
                    <div id="sdText">SD kártya...</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">SD Kártya</div>
                  </div>
                </div>
                <div class="status-item">
                  <span class="status-icon" id="serverStatus">🌐</span>
                  <div class="status-content">
                    <div id="serverText">Webszerver státusz...</div>
                    <div style="font-size: 0.75em; opacity: 0.8;">Webszerver</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-card">
                  <h3>📊 Rendszer Állapot</h3>
                  <div class="info-row"><span class="info-label">Verzió:</span><span class="info-value" id="systemVersion">--</span></div>
                  <div class="info-row"><span class="info-label">Uptime:</span><span class="info-value" id="uptime">--</span></div>
                  <div class="info-row"><span class="info-label">Memória:</span><span class="info-value" id="memory">--</span></div>
                </div>
                <div class="info-card">
                  <h3>💡 LED Információk</h3>
                  <div class="info-row"><span class="info-label">LED szalagok:</span><span class="info-value" id="ledCount">--</span></div>
                  <div class="info-row"><span class="info-label">PIR szenzorok:</span><span class="info-value" id="pirCount">--</span></div>
                </div>
              </div>

              <div class="api-section">
                <h2>🔗 API Végpontok</h2>
                <div id="apiEndpoints"></div>
              </div>
            </div>
            
            <div class="footer">
              <p>Arduino LED Controller v${config.version} | Web szerver: port ${config.port}</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html lang="hu">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hiba - Arduino LED Vezérlő</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .error-container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            text-align: center;
          }
          .error-icon {
            font-size: 4em;
            margin-bottom: 20px;
          }
          .error-title {
            color: #dc3545;
            font-size: 2em;
            margin-bottom: 10px;
          }
          .error-message {
            color: #6c757d;
            font-size: 1.1em;
            margin-bottom: 20px;
          }
          .error-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #495057;
            text-align: left;
          }
          .btn-primary {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
          }
          .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h1 class="error-title">Kapcsolati Hiba</h1>
          <p class="error-message">Az Arduino eszköz nem elérhető.</p>
          <div class="error-details">
            <strong>Cél IP cím:</strong> ${config.arduinoIP}:${config.arduinoPort}<br>
            <strong>Hiba:</strong> ${error.message}<br>
            <strong>Időpont:</strong> ${new Date().toISOString()}
          </div>
          <button onclick="location.reload()" class="btn-primary">Újrapróbálás</button>
        </div>
      </body>
      </html>
    `);
  }
});

// App version
app.get('/api/app/version', (req, res) => {
  try {
    const versionPath = path.join(__dirname, 'version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      res.json(versionData);
    } else {
      res.json({
        version: config.version,
        timestamp: new Date().toISOString(),
        message: "Version file not found, using default"
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verzió információ nem elérhető' });
  }
});

// ========================= SOCKET.IO HANDLERS =========================

io.on('connection', (socket) => {
  logger.info('🔌 WebSocket client connected');

  // Send initial Arduino status
  arduino.get('/api/status')
    .then(status => {
      socket.emit('arduinoStatus', status);
    })
    .catch(error => {
      socket.emit('arduinoOffline', { 
        message: error.message, 
        timestamp: new Date().toISOString(),
        code: 'ARDUINO_OFFLINE'
      });
    });

  socket.on('disconnect', () => {
    logger.info('🔌 WebSocket client disconnected');
  });

  // Real-time status request
  socket.on('requestStatus', async () => {
    try {
      const status = await arduino.get('/api/status');
      socket.emit('arduinoStatus', status);
    } catch (error) {
      socket.emit('arduinoOffline', { 
        message: error.message, 
        timestamp: new Date().toISOString(),
        code: 'ARDUINO_OFFLINE'
      });
    }
  });
});

// Periodic status check (every 30 seconds)
cron.schedule('*/30 * * * * *', async () => {
  try {
    const status = await arduino.get('/api/status');
    io.emit('arduinoStatus', status);
  } catch (error) {
    io.emit('arduinoOffline', { 
      message: 'Arduino nem elérhető', 
      timestamp: new Date().toISOString(),
      code: 'ARDUINO_OFFLINE'
    });
  }
});

// ========================= ERROR HANDLING =========================

app.use((error, req, res, next) => {
  logger.error('❌ Server error:', error.stack);
  
  const statusCode = error.statusCode || 500;
  const errorMessage = process.env.NODE_ENV === 'development' 
    ? (error.message || 'Ismeretlen hiba') 
    : 'Belső szerver hiba';
  
  res.status(statusCode).json({ 
    error: errorMessage,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  res.status(err.status || 404).json({ 
    error: err.message || 'Végpont nem található',
    code: err.code || 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
});

// ========================= START SERVER =========================

server.listen(config.port, config.bindHost, () => {
  logger.info('🚀 Arduino LED Controller started!');
  logger.info(`📍 Web interface: http://0.0.0.0:${config.port}`);
  logger.info(`🤖 Arduino: ${config.arduinoIP}:${config.arduinoPort}`);
  logger.info(`🌐 Arduino HTTP: ${process.platform === 'darwin' && process.env.ARDUINO_HTTP_TRANSPORT === 'curl' ? 'macOS natív kapcsolat' : 'Node kapcsolat'}`);
  logger.info(`📡 Console (WebSocket): port ${config.consolePort}`);
  logger.info(`📁 Data dir: ${config.dataDir}`);
  logger.info(`📅 Schedules dir: ${config.schedulesDir}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('🛑 SIGTERM received, shutting down...');
  server.close(() => {
    logger.info('✅ Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('🛑 SIGINT received, shutting down...');
  server.close(() => {
    logger.info('✅ Process terminated');
    process.exit(0);
  });
});

module.exports = app;
