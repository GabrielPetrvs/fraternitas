const express = require('express');
const router = express.Router();
const { prepare } = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.get('/chat/:amigo_id', auth, (req, res) => {
  const uid = req.session.usuario.id;
  const amigoId = req.params.amigo_id;
  const amigo = prepare('SELECT id, nome FROM users WHERE id = ?').get(amigoId);
  if (!amigo) return res.redirect('/inicio');

  const roomId = [uid, parseInt(amigoId)].sort((a,b) => a-b).join('_');

  let historico = [];
  try {
    historico = prepare(`
      SELECT m.*, u.nome as de_nome FROM chat_mensagens m
      JOIN users u ON u.id = m.de_user_id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC LIMIT 50
    `).all(roomId);
  } catch(e) {}

  res.render('chat', { amigo, roomId, historico });
});

module.exports = router;
