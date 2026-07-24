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
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const winston = require('winston');
require('dotenv').config();

// ========================= KONFIGURÁCIÓ =========================

const config = {
  port: process.env.PORT || 3000,
  arduinoIP: process.env.ARDUINO_IP || '10.0.0.117',
  arduinoPort: process.env.ARDUINO_PORT || 80,
  consolePort: process.env.CONSOLE_PORT || 81,
  dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
  configDir: process.env.CONFIG_DIR || path.join(__dirname, 'config'),
  schedulesDir: process.env.SCHEDULES_DIR || path.join(__dirname, 'schedules'),
  version: getAppVersion()
};

function getAppVersion() {
  try {
    const versionPath = path.join(__dirname, 'version.json');
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return versionData.version;
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
      const response = await axios({
        ...options,
        url
      });
      
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

function validateLocalSchedule(schedule) {
  if (!Number.isInteger(schedule.day) || schedule.day < 1 || schedule.day > 7) return 'A nap 1 (hétfő) és 7 (vasárnap) közötti szám legyen.';
  if (typeof schedule.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time)) return 'Az idő formátuma HH:MM legyen.';
  if (!Array.isArray(schedule.leds) || schedule.leds.length === 0) return 'Legalább egy LED-et ki kell választani.';
  for (const led of schedule.leds) {
    if (!Number.isInteger(led.id) || led.id < 1 || led.id > 3 || typeof led.enabled !== 'boolean') return 'Érvénytelen LED-beállítás.';
    if (!Number.isInteger(led.brightness) || led.brightness < 0 || led.brightness > 255) return 'A fényerő 0 és 255 közötti egész szám legyen.';
    if (!Number.isInteger(led.effect) || led.effect < 0 || led.effect > 4) return 'Az effekt 0 és 4 közötti egész szám legyen.';
    if (!Array.isArray(led.color) || led.color.length !== 3 || led.color.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return 'Érvénytelen RGB szín.';
  }
  return null;
}

async function runLocalSchedules() {
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
  const { enabled, brightness, effect, color } = req.body || {};

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

// Helyi (Macen tárolt) heti ütemezések.
app.get('/api/local-schedules', (req, res) => {
  res.json({ schedules: localSchedules });
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
function ledCard(led){const el=document.createElement('article');el.className='led-card';el.dataset.id=led.id;el.innerHTML='<div class="led-title"><div><h2>LED szalag '+led.id+'</h2><span class="state">Egyedi vezérlés</span></div><span class="mini-dot '+(led.enabled?'on':'')+'"></span></div><div class="line"><label>Bekapcsolva</label><input class="switch enabled" type="checkbox"></div><div class="line"><label>Szín</label><input class="color" type="color"></div><div class="line"><label>Fényerő</label><span class="value"></span></div><input class="brightness" type="range" min="0" max="255"><div class="line"><label>Effekt</label><select class="effect"></select></div><button class="apply">Beállítások elküldése</button><div class="status"></div>';el.querySelector('.enabled').checked=!!led.enabled;el.querySelector('.color').value=hex(led.color);const slider=el.querySelector('.brightness');slider.value=led.brightness==null?100:led.brightness;el.querySelector('.value').textContent=slider.value;slider.addEventListener('input',function(){el.querySelector('.value').textContent=slider.value});effects.forEach(function(name,index){const option=new Option(name,index);option.selected=Number(led.effect)===index;el.querySelector('.effect').add(option)});el.querySelector('.apply').addEventListener('click',function(){applyLed(el)});return el}
async function applyLed(el){const id=Number(el.dataset.id),button=el.querySelector('.apply'),status=el.querySelector('.status');button.disabled=true;status.textContent='Küldés…';try{await request('/api/arduino/led/'+id,{method:'POST',body:JSON.stringify({enabled:el.querySelector('.enabled').checked,brightness:Number(el.querySelector('.brightness').value),effect:Number(el.querySelector('.effect').value),color:rgb(el.querySelector('.color').value)})});status.textContent='✓ Beállítás elküldve';msg('LED '+id+' beállítva');loadStatus()}catch(error){status.textContent='✕ '+error.message;msg(error.message,true)}finally{button.disabled=false}}
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
    section.innerHTML = '<div class="panel scheduler"><div class="panel-head"><div><h2>Kapcsolati beállítások</h2><div class="muted">Itt állíthatod át, melyik Arduino vezérlőt használja a szerver.</div></div></div><div class="line"><label>Arduino IP-címe vagy neve</label><input id="settingsArduinoIP" type="text" inputmode="url" placeholder="például: 10.0.0.117"></div><div class="line"><label>Arduino port</label><input id="settingsArduinoPort" type="number" min="1" max="65535" value="80"></div><button id="saveArduinoSettings" class="primary" style="width:100%;margin-top:10px">Kapcsolat mentése</button><p id="settingsConnection" class="muted">A mentett cím betöltése…</p></div>';
    main.append(section);

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

    function showSettings() {
      document.querySelectorAll('.view').forEach(function (view) { view.classList.toggle('active', view.id === 'settings'); });
      document.querySelectorAll('.nav button').forEach(function (button) { button.classList.toggle('active', button === navButton); });
      document.getElementById('viewName').textContent = 'Konfiguráció';
      document.getElementById('pageTitle').textContent = 'Kapcsolati beállítások';
      loadSettings();
    }

    navButton.addEventListener('click', showSettings);
    document.getElementById('saveArduinoSettings').addEventListener('click', saveSettings);
  }());
  </script></body>`);
}

// Main dashboard
app.get('/', async (req, res) => {
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

server.listen(config.port, '0.0.0.0', () => {
  logger.info('🚀 Arduino LED Controller started!');
  logger.info(`📍 Web interface: http://0.0.0.0:${config.port}`);
  logger.info(`🤖 Arduino: ${config.arduinoIP}:${config.arduinoPort}`);
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
