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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

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
    this.baseURL = `http://${ip}:${port}`;
    this.timeout = Number(process.env.ARDUINO_TIMEOUT_MS) || 30000;
    this.maxRetries = Number(process.env.ARDUINO_RETRY_COUNT) || 3;
    this.retryDelay = Number(process.env.ARDUINO_RETRY_DELAY) || 2000;
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
    this.baseURL = `http://${ip}:${port}`;
    this.timeout = Number(process.env.ARDUINO_TIMEOUT_MS) || 30000;
    this.maxRetries = Number(process.env.ARDUINO_RETRY_COUNT) || 3;
    this.retryDelay = Number(process.env.ARDUINO_RETRY_DELAY) || 2000;
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

// Helyi (Macen tárolt) heti ütemezések.
app.get('/api/local-schedules', (req, res) => {
  res.json({ schedules: localSchedules });
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
:root{color-scheme:dark;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{margin:0;background:#101526;color:#edf2ff}.wrap{max-width:1120px;margin:auto;padding:24px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.badge{background:#263453;color:#b8cbff;padding:8px 12px;border-radius:99px;font-size:.9rem}.toolbar{display:flex;gap:10px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}.card{background:#1a2238;border:1px solid #2a3657;border-radius:16px;padding:18px;box-shadow:0 10px 24px #0003}.card h2{margin:0 0 14px;font-size:1.2rem}.line{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0}.line label{color:#bbc5dc}.value{min-width:38px;text-align:right;color:#89a9ff}.switch{width:52px;height:30px;appearance:none;background:#46516b;border-radius:20px;position:relative;cursor:pointer;transition:.2s}.switch:checked{background:#3ebd78}.switch:before{content:"";position:absolute;width:22px;height:22px;border-radius:50%;background:#fff;top:4px;left:4px;transition:.2s}.switch:checked:before{left:26px}input[type=range]{width:100%;accent-color:#7599ff}input[type=color]{width:48px;height:32px;border:0;background:none;cursor:pointer}select,button,input[type=time]{font:inherit;border-radius:8px;border:1px solid #40517a;padding:9px 10px}select,input[type=time]{background:#111a2c;color:#fff;flex:1}button{cursor:pointer;background:#5276ea;color:#fff;font-weight:600}button:hover{background:#6c8cff}button.danger{background:#c34359;border-color:#c34359}button.full{width:100%;margin-top:12px}.status{font-size:.85rem;color:#aeb9d2;min-height:1.2em}.notice{position:fixed;right:20px;bottom:20px;max-width:390px;padding:14px 16px;border-radius:10px;background:#263b62;border:1px solid #5f8cff;box-shadow:0 8px 24px #0008;display:none}.notice.error{background:#572b36;border-color:#e36677}.system{margin-top:20px;white-space:pre-wrap}.muted{color:#aeb9d2;font-size:.9rem}.schedule-led{border-top:1px solid #334267;padding-top:12px;margin-top:12px}.schedule-list{margin-top:16px}.schedule-item{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#111a2c;border-radius:9px;padding:10px;margin:8px 0}.schedule-item small{color:#bbc5dc}@media(max-width:600px){.top{align-items:flex-start;flex-direction:column}.wrap{padding:16px}}
</style></head><body><main class="wrap"><div class="top"><div><h1>💡 Arduino LED vezérlő</h1><div class="muted">UNO R4 WiFi · <span id="connection">Kapcsolódás…</span></div></div><div class="toolbar"><button id="allOn">Összes be</button><button id="allOff" class="danger">Összes ki</button><button id="refresh">Frissítés</button></div></div><section class="grid" id="leds"></section><section class="card system"><h2>📅 Heti időzítés (a Macen tárolva)</h2><div class="line"><label>Idő</label><input id="scheduleTime" type="time" value="19:30"></div><div class="line"><label><input id="allScheduleDays" type="checkbox"> Összes nap</label></div><div class="line"><label><input class="schedule-day" type="checkbox" value="1"> Hétfő</label><label><input class="schedule-day" type="checkbox" value="2"> Kedd</label><label><input class="schedule-day" type="checkbox" value="3"> Szerda</label><label><input class="schedule-day" type="checkbox" value="4"> Csütörtök</label></div><div class="line"><label><input class="schedule-day" type="checkbox" value="5"> Péntek</label><label><input class="schedule-day" type="checkbox" value="6"> Szombat</label><label><input class="schedule-day" type="checkbox" value="7"> Vasárnap</label></div><div id="scheduleLedEditor"></div><button id="saveSchedule" class="full">Új időzítés mentése</button><p class="muted">Minden mentés új bejegyzést hoz létre, tehát egy naphoz több időpontot is hozzáadhatsz.</p><div class="schedule-list" id="scheduleList"></div></section><section class="card system"><h2>Rendszerállapot</h2><div id="systemStatus">Betöltés…</div></section></main><div class="notice" id="notice" role="status"></div>
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
async function load(){document.getElementById('connection').textContent='Kapcsolódás…';try{const status=await request('/api/arduino/status');const strips=status.strips||[];ledRoot.replaceChildren(...strips.map(card));document.getElementById('connection').textContent='Arduino elérhető';document.getElementById('systemStatus').textContent='WiFi: '+(status.connected?'kapcsolódva':'nincs kapcsolat')+' · Idő: '+(status.timesynced?'szinkronizálva':'nincs szinkron')+' · SD: '+(status.sdCard?'elérhető':'nincs')+' · Uptime: '+(status.uptime??'?')+' mp';}catch(error){document.getElementById('connection').textContent='Kapcsolati hiba';ledRoot.replaceChildren();document.getElementById('systemStatus').textContent=error.message;message(error.message,true)}}
document.getElementById('allOn').addEventListener('click',()=>all(true));document.getElementById('allOff').addEventListener('click',()=>all(false));document.getElementById('refresh').addEventListener('click',load);document.getElementById('saveSchedule').addEventListener('click',saveSchedule);document.getElementById('allScheduleDays').addEventListener('change',event=>document.querySelectorAll('.schedule-day').forEach(input=>input.checked=event.target.checked));document.querySelectorAll('.schedule-day').forEach(input=>input.addEventListener('change',()=>document.getElementById('allScheduleDays').checked=[...document.querySelectorAll('.schedule-day')].every(day=>day.checked)));load();loadSchedules();
</script></body></html>`;
}

// Main dashboard
app.get('/', async (req, res) => {
  // A kezelőfelület azonnal töltődjön be akkor is, ha az Arduino épp lassan
  // válaszol. Az állapotot a böngésző külön kéréssel frissíti.
  return res.type('html').send(renderControlDashboard());

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
