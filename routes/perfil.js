const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prepare } = require('../db');
const { getDb, saveDb } = require('../database');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

// Setup upload
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? process.env.RAILWAY_VOLUME_MOUNT_PATH
  : path.join(__dirname, '..', 'data');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('not found');
});

// Add visto column if not exists
function ensureColumns() {
  try { getDb().run("ALTER TABLE amizades ADD COLUMN visto INTEGER DEFAULT 0"); saveDb(); } catch(e) {}
  try { getDb().run("ALTER TABLE users ADD COLUMN foto TEXT DEFAULT ''"); saveDb(); } catch(e) {}
  try { getDb().run("ALTER TABLE comunidades ADD COLUMN foto TEXT DEFAULT ''"); saveDb(); } catch(e) {}
}

router.get('/inicio', auth, (req, res) => {
  ensureColumns();
  const uid = req.session.usuario.id;

  const amigos = prepare(`
    SELECT u.id, u.nome, u.cidade, u.estado, u.foto FROM users u
    JOIN amizades a ON (a.amigo_id = u.id AND a.user_id = ? AND a.status='aceito')
    OR (a.user_id = u.id AND a.amigo_id = ? AND a.status='aceito')
    LIMIT 6
  `).all(uid, uid);

  const scrapsRecentes = prepare(`
    SELECT s.*, u.nome as de_nome FROM scraps s
    JOIN users u ON u.id = s.de_user_id
    WHERE s.para_user_id = ?
    ORDER BY s.created_at DESC LIMIT 3
  `).all(uid);

  const comunidades = prepare(`
    SELECT c.* FROM comunidades c
    JOIN membros_comunidade m ON m.comunidade_id = c.id
    WHERE m.user_id = ? LIMIT 4
  `).all(uid);

  const solicitacoes = prepare(`
    SELECT a.id, u.nome, u.id as uid FROM amizades a
    JOIN users u ON u.id = a.user_id
    WHERE a.amigo_id = ? AND a.status = 'pendente'
  `).all(uid);

  let aceitaram = [];
  try {
    aceitaram = prepare(`
      SELECT u.id, u.nome FROM amizades a
      JOIN users u ON u.id = a.amigo_id
      WHERE a.user_id = ? AND a.status = 'aceito' AND a.visto = 0
    `).all(uid);
  } catch(e) {}

  res.render('inicio', { amigos, scrapsRecentes, comunidades, solicitacoes, aceitaram });
});

router.post('/notificacao/vista', auth, (req, res) => {
  const uid = req.session.usuario.id;
  try { prepare("UPDATE amizades SET visto = 1 WHERE user_id = ? AND status = 'aceito'").run(uid); } catch(e) {}
  res.redirect('/inicio');
});

router.get('/perfil/:id?', auth, (req, res) => {
  const id = req.params.id || req.session.usuario.id;
  const perfil = prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!perfil) return res.redirect('/inicio');

  const uid = req.session.usuario.id;

  const amigos = prepare(`
    SELECT u.id, u.nome FROM users u
    JOIN amizades a ON (a.amigo_id = u.id AND a.user_id = ? AND a.status='aceito')
    OR (a.user_id = u.id AND a.amigo_id = ? AND a.status='aceito')
  `).all(id, id);

  const scraps = prepare(`
    SELECT s.*, u.nome as de_nome FROM scraps s
    JOIN users u ON u.id = s.de_user_id
    WHERE s.para_user_id = ?
    ORDER BY s.created_at DESC LIMIT 10
  `).all(id);

  const depoimentos = prepare(`
    SELECT d.*, u.nome as de_nome FROM depoimentos d
    JOIN users u ON u.id = d.de_user_id
    WHERE d.para_user_id = ?
    ORDER BY d.created_at DESC
  `).all(id);

  const comunidades = prepare(`
    SELECT c.* FROM comunidades c
    JOIN membros_comunidade m ON m.comunidade_id = c.id
    WHERE m.user_id = ?
  `).all(id);

  const mediaKarma = prepare(`
    SELECT AVG(confiabilidade) as conf, AVG(criatividade) as cria, AVG(sexualidade) as sexu
    FROM depoimentos WHERE para_user_id = ?
  `).get(id);

  const amizade = prepare('SELECT * FROM amizades WHERE (user_id=? AND amigo_id=?) OR (user_id=? AND amigo_id=?)').get(uid, id, id, uid);
  const ehMeuPerfil = parseInt(id) === uid;

  res.render('perfil', { perfil, amigos, scraps, depoimentos, comunidades, mediaKarma, amizade, ehMeuPerfil });
});

router.post('/perfil/foto', auth, upload.single('foto'), (req, res) => {
  if (!req.file) return res.redirect('/perfil');
  const uid = req.session.usuario.id;
  const fotoUrl = '/uploads/' + req.file.filename;
  const old = prepare('SELECT foto FROM users WHERE id = ?').get(uid);
  if (old && old.foto && old.foto.startsWith('/uploads/')) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(old.foto))); } catch(e) {}
  }
  prepare('UPDATE users SET foto = ? WHERE id = ?').run(fotoUrl, uid);
  req.session.usuario.foto = fotoUrl;
  saveDb();
  res.redirect('/perfil');
});

router.post('/comunidade/:id/foto', auth, upload.single('foto'), (req, res) => {
  const cid = req.params.id;
  const uid = req.session.usuario.id;
  const com = prepare('SELECT * FROM comunidades WHERE id = ?').get(cid);
  if (!com || com.dono_id !== uid || !req.file) return res.redirect('/comunidade/' + cid);
  const fotoUrl = '/uploads/' + req.file.filename;
  if (com.foto && com.foto.startsWith('/uploads/')) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(com.foto))); } catch(e) {}
  }
  prepare('UPDATE comunidades SET foto = ? WHERE id = ?').run(fotoUrl, cid);
  saveDb();
  res.redirect('/comunidade/' + cid);
});

router.post('/perfil/editar', auth, (req, res) => {
  const { nome, cidade, estado, sobre, interesses } = req.body;
  const uid = req.session.usuario.id;
  prepare('UPDATE users SET nome=?, cidade=?, estado=?, sobre=?, interesses=? WHERE id=?').run(nome, cidade, estado, sobre, interesses, uid);
  req.session.usuario.nome = nome;
  res.redirect('/perfil');
});

router.get('/buscar', auth, (req, res) => {
  const q = req.query.q || '';
  const users = q ? prepare("SELECT id, nome, cidade, estado FROM users WHERE nome LIKE ? AND id != ? LIMIT 20").all('%'+q+'%', req.session.usuario.id) : [];
  res.render('buscar', { users, q });
});

module.exports = router;
