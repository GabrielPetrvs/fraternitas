const express = require('express');
const router = express.Router();
const db = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.post('/amigo/adicionar', auth, (req, res) => {
  const { amigo_id } = req.body;
  const uid = req.session.usuario.id;
  if (parseInt(amigo_id) === uid) return res.redirect('back');
  try {
    db.prepare('INSERT INTO amizades (user_id, amigo_id, status) VALUES (?,?,?)').run(uid, amigo_id, 'pendente');
  } catch(e) {}
  res.redirect(`/perfil/${amigo_id}`);
});

router.post('/amigo/aceitar', auth, (req, res) => {
  const { amizade_id } = req.body;
  db.prepare("UPDATE amizades SET status='aceito' WHERE id=? AND amigo_id=?").run(amizade_id, req.session.usuario.id);
  res.redirect('/inicio');
});

router.post('/amigo/recusar', auth, (req, res) => {
  const { amizade_id } = req.body;
  db.prepare('DELETE FROM amizades WHERE id=? AND amigo_id=?').run(amizade_id, req.session.usuario.id);
  res.redirect('/inicio');
});

router.post('/amigo/remover', auth, (req, res) => {
  const { amigo_id } = req.body;
  const uid = req.session.usuario.id;
  db.prepare('DELETE FROM amizades WHERE (user_id=? AND amigo_id=?) OR (user_id=? AND amigo_id=?)').run(uid, amigo_id, amigo_id, uid);
  res.redirect(`/perfil/${amigo_id}`);
});

router.get('/amigos', auth, (req, res) => {
  const uid = req.session.usuario.id;
  const amigos = db.prepare(`
    SELECT u.id, u.nome, u.cidade, u.estado FROM users u
    JOIN amizades a ON (a.amigo_id = u.id AND a.user_id = ? AND a.status='aceito')
    OR (a.user_id = u.id AND a.amigo_id = ? AND a.status='aceito')
  `).all(uid, uid);
  res.render('amigos', { amigos });
});

module.exports = router;
