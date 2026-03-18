const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prepare } = require('../db');
const { saveDb } = require('../database');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? process.env.RAILWAY_VOLUME_MOUNT_PATH
  : path.join(__dirname, '..', 'data');

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

// Serve uploaded files
router.get('/uploads/:filename', (req, res) => {
  const file = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('not found');
});

// Upload foto de perfil
router.post('/perfil/foto', auth, upload.single('foto'), (req, res) => {
  if (!req.file) return res.redirect('/perfil');
  const uid = req.session.usuario.id;
  const fotoUrl = '/uploads/' + req.file.filename;
  
  // Delete old photo
  const old = prepare('SELECT foto FROM users WHERE id = ?').get(uid);
  if (old && old.foto && old.foto.startsWith('/uploads/')) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(old.foto));
    try { fs.unlinkSync(oldFile); } catch(e) {}
  }
  
  prepare('UPDATE users SET foto = ? WHERE id = ?').run(fotoUrl, uid);
  req.session.usuario.foto = fotoUrl;
  saveDb();
  res.redirect('/perfil');
});

// Upload foto de comunidade
router.post('/comunidade/:id/foto', auth, upload.single('foto'), (req, res) => {
  const cid = req.params.id;
  const uid = req.session.usuario.id;
  const comunidade = prepare('SELECT * FROM comunidades WHERE id = ?').get(cid);
  if (!comunidade || comunidade.dono_id !== uid) return res.redirect('/comunidade/' + cid);
  if (!req.file) return res.redirect('/comunidade/' + cid);
  
  const fotoUrl = '/uploads/' + req.file.filename;

  // Delete old photo
  if (comunidade.foto && comunidade.foto.startsWith('/uploads/')) {
    const oldFile = path.join(UPLOAD_DIR, path.basename(comunidade.foto));
    try { fs.unlinkSync(oldFile); } catch(e) {}
  }

  prepare('UPDATE comunidades SET foto = ? WHERE id = ?').run(fotoUrl, cid);
  saveDb();
  res.redirect('/comunidade/' + cid);
});

module.exports = router;
