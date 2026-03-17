const express = require('express');
const router = express.Router();
const db = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.post('/scrap/enviar', auth, (req, res) => {
  const { para_user_id, texto } = req.body;
  if (!texto || !texto.trim()) return res.redirect('back');
  db.prepare('INSERT INTO scraps (de_user_id, para_user_id, texto) VALUES (?,?,?)').run(req.session.usuario.id, para_user_id, texto.trim());
  res.redirect(`/perfil/${para_user_id}`);
});

router.post('/scrap/deletar', auth, (req, res) => {
  const { scrap_id, perfil_id } = req.body;
  const uid = req.session.usuario.id;
  const scrap = db.prepare('SELECT * FROM scraps WHERE id = ?').get(scrap_id);
  if (scrap && (scrap.para_user_id === uid || scrap.de_user_id === uid)) {
    db.prepare('DELETE FROM scraps WHERE id = ?').run(scrap_id);
  }
  res.redirect(`/perfil/${perfil_id}`);
});

router.get('/depoimento/:para_id', auth, (req, res) => {
  const para = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.para_id);
  if (!para) return res.redirect('/inicio');
  const existente = db.prepare('SELECT * FROM depoimentos WHERE de_user_id=? AND para_user_id=?').get(req.session.usuario.id, para.id);
  res.render('depoimento', { para, existente });
});

router.post('/depoimento/enviar', auth, (req, res) => {
  const { para_user_id, texto, confiabilidade, criatividade, sexualidade } = req.body;
  const uid = req.session.usuario.id;
  if (parseInt(para_user_id) === uid) return res.redirect('/inicio');
  db.prepare(`
    INSERT INTO depoimentos (de_user_id, para_user_id, texto, confiabilidade, criatividade, sexualidade)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(de_user_id, para_user_id) DO UPDATE SET texto=excluded.texto,
    confiabilidade=excluded.confiabilidade, criatividade=excluded.criatividade, sexualidade=excluded.sexualidade
  `).run(uid, para_user_id, texto, confiabilidade || 3, criatividade || 3, sexualidade || 3);
  res.redirect(`/perfil/${para_user_id}`);
});

module.exports = router;
