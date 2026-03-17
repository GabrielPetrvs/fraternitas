const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH)
  : path.join(__dirname, 'data');

const DB_PATH = path.join(DATA_DIR, 'fraternitas.db');

let _db = null;

function saveDb() {
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, cidade TEXT DEFAULT '', estado TEXT DEFAULT '', sobre TEXT DEFAULT '', interesses TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS amizades (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amigo_id INTEGER, status TEXT DEFAULT 'pendente', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, amigo_id));
    CREATE TABLE IF NOT EXISTS scraps (id INTEGER PRIMARY KEY AUTOINCREMENT, de_user_id INTEGER, para_user_id INTEGER, texto TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS depoimentos (id INTEGER PRIMARY KEY AUTOINCREMENT, de_user_id INTEGER, para_user_id INTEGER, texto TEXT NOT NULL, confiabilidade INTEGER DEFAULT 3, criatividade INTEGER DEFAULT 3, sexualidade INTEGER DEFAULT 3, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(de_user_id, para_user_id));
    CREATE TABLE IF NOT EXISTS comunidades (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, descricao TEXT DEFAULT '', categoria TEXT DEFAULT 'geral', dono_id INTEGER, icone TEXT DEFAUL
