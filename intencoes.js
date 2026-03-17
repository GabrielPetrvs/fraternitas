const express = require('express');
const router = express.Router();
const { prepare } = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.get('/intencoes', auth, (req, res) => {
  const uid = req.session.usuario.id;
  const intencoes = prepare(`
    SELECT i.*, u.nome as autor,
    (SELECT COUNT(*) FROM intencoes_amens WHERE intencao_id = i.id) as total_amens,
    (SELECT COUNT(*) FROM intencoes_amens WHERE intencao_id = i.id AND user_id = ?) as eu_amei
    FROM intencoes i JOIN users u ON u.id = i.user_id
    ORDER BY i.created_at DESC
  `).all(uid);
  res.render('intencoes', { intencoes });
});

router.post('/intencoes/criar', auth, (req, res) => {
  const { texto } = req.body;
  if (!texto || !texto.trim()) return res.redirect('/intencoes');
  prepare('INSERT INTO intencoes (user_id, texto) VALUES (?,?)').run(req.session.usuario.id, texto.trim());
  res.redirect('/intencoes');
});

router.post('/intencoes/amen', auth, (req, res) => {
  const { intencao_id } = req.body;
  const uid = req.session.usuario.id;
  try {
    prepare('INSERT INTO intencoes_amens (intencao_id, user_id) VALUES (?,?)').run(intencao_id, uid);
  } catch(e) {
    prepare('DELETE FROM intencoes_amens WHERE intencao_id=? AND user_id=?').run(intencao_id, uid);
  }
  res.redirect('/intencoes');
});

module.exports = router;
