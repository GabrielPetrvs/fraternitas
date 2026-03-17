const express = require('express');
const router = express.Router();
const db = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.get('/inicio', auth, (req, res) => {
  const uid = req.session.usuario.id;
  const amigos = db.prepare(`
    SELECT u.id, u.nome, u.cidade, u.estado FROM users u
    JOIN amizades a ON (a.amigo_id = u.id AND a.user_id = ? AND a.status='aceito')
    OR (a.user_id = u.id AND a.amigo_id = ? AND a.status='aceito')
    LIMIT 6
  `).all(uid, uid);

  const scrapsRecentes = db.prepare(`
    SELECT s.*, u.nome as de_nome FROM scraps s
    JOIN users u ON u.id = s.de_user_id
    WHERE s.para_user_id = ?
    ORDER BY s.created_at DESC LIMIT 3
  `).all(uid);

  const comunidades = db.prepare(`
    SELECT c.* FROM comunidades c
    JOIN membros_comunidade m ON m.comunidade_id = c.id
    WHERE m.user_id = ? LIMIT 4
  `).all(uid);

  const solicitacoes = db.prepare(`
    SELECT a.id, u.nome, u.id as uid FROM amizades a
    JOIN users u ON u.id = a.user_id
    WHERE a.amigo_id = ? AND a.status = 'pendente'
  `).all(uid);

  res.render('inicio', { amigos, scrapsRecentes, comunidades, solicitacoes });
});

router.get('/perfil/:id?', auth, (req, res) => {
  const id = req.params.id || req.session.usuario.id;
  const perfil = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!perfil) return res.redirect('/inicio');

  const uid = req.session.usuario.id;
  const amigos = db.prepare(`
    SELECT u.id, u.nome FROM users u
    JOIN amizades a ON (a.amigo_id = u.id AND a.user_id = ? AND a.status='aceito')
    OR (a.user_id = u.id AND a.amigo_id = ? AND a.status='aceito')
  `).all(id, id);

  const scraps = db.prepare(`
    SELECT s.*, u.nome as de_nome FROM scraps s
    JOIN users u ON u.id = s.de_user_id
    WHERE s.para_user_id = ?
    ORDER BY s.created_at DESC LIMIT 10
  `).all(id);

  const depoimentos = db.prepare(`
    SELECT d.*, u.nome as de_nome FROM depoimentos d
    JOIN users u ON u.id = d.de_user_id
    WHERE d.para_user_id = ?
    ORDER BY d.created_at DESC
  `).all(id);

  const comunidades = db.prepare(`
    SELECT c.* FROM comunidades c
    JOIN membros_comunidade m ON m.comunidade_id = c.id
    WHERE m.user_id = ?
  `).all(id);

  const mediaKarma = db.prepare(`
    SELECT AVG(confiabilidade) as conf, AVG(criatividade) as cria, AVG(sexualidade) as sexu
    FROM depoimentos WHERE para_user_id = ?
  `).get(id);

  const amizade = db.prepare('SELECT * FROM amizades WHERE (user_id=? AND amigo_id=?) OR (user_id=? AND amigo_id=?)').get(uid, id, id, uid);
  const ehMeuPerfil = parseInt(id) === uid;

  res.render('perfil', { perfil, amigos, scraps, depoimentos, comunidades, mediaKarma, amizade, ehMeuPerfil });
});

router.post('/perfil/editar', auth, (req, res) => {
  const { nome, cidade, estado, sobre, interesses } = req.body;
  const uid = req.session.usuario.id;
  db.prepare('UPDATE users SET nome=?, cidade=?, estado=?, sobre=?, interesses=? WHERE id=?').run(nome, cidade, estado, sobre, interesses, uid);
  req.session.usuario.nome = nome;
  req.session.usuario.cidade = cidade;
  req.session.usuario.estado = estado;
  res.redirect('/perfil');
});

router.get('/buscar', auth, (req, res) => {
  const q = req.body.q || req.query.q || '';
  const users = q ? db.prepare("SELECT id, nome, cidade, estado FROM users WHERE nome LIKE ? AND id != ? LIMIT 20").all(`%${q}%`, req.session.usuario.id) : [];
  res.render('buscar', { users, q });
});

module.exports = router;
