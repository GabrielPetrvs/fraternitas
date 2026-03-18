const express = require('express');
const router = express.Router();
const db = require('../db');

function auth(req, res, next) {
  if (!req.session.usuario) return res.redirect('/');
  next();
}

router.get('/comunidades', auth, (req, res) => {
  const uid = req.session.usuario.id;
  const minhas = db.prepare(`
    SELECT c.*, COUNT(m2.id) as total FROM comunidades c
    JOIN membros_comunidade m ON m.comunidade_id = c.id AND m.user_id = ?
    LEFT JOIN membros_comunidade m2 ON m2.comunidade_id = c.id
    GROUP BY c.id
  `).all(uid);

  const todas = db.prepare(`
    SELECT c.*, COUNT(m.id) as total FROM comunidades c
    LEFT JOIN membros_comunidade m ON m.comunidade_id = c.id
    GROUP BY c.id ORDER BY total DESC LIMIT 20
  `).all();

  res.render('comunidades', { minhas, todas });
});

router.get('/comunidade/:id', auth, (req, res) => {
  const com = db.prepare('SELECT * FROM comunidades c WHERE c.id = ?').get(req.params.id);
  if (!com) return res.redirect('/comunidades');
  const uid = req.session.usuario.id;

  const membros = db.prepare(`
    SELECT u.id, u.nome FROM users u
    JOIN membros_comunidade m ON m.user_id = u.id
    WHERE m.comunidade_id = ?
  `).all(com.id);

  const topicos = db.prepare(`
    SELECT t.*, u.nome as autor FROM topicos t
    JOIN users u ON u.id = t.user_id
    WHERE t.comunidade_id = ?
    ORDER BY t.created_at DESC
  `).all(com.id);

  const ehMembro = db.prepare('SELECT id FROM membros_comunidade WHERE comunidade_id=? AND user_id=?').get(com.id, uid);
  const total = membros.length;

  res.render('comunidade', { com, membros, topicos, ehMembro, total });
});

router.post('/comunidade/criar', auth, (req, res) => {
  const { nome, descricao, categoria, icone } = req.body;
  if (!nome) return res.redirect('/comunidades');
  const uid = req.session.usuario.id;
  const result = db.prepare('INSERT INTO comunidades (nome, descricao, categoria, icone, dono_id) VALUES (?,?,?,?,?)').run(nome, descricao, categoria || 'geral', icone || '💬', uid);
  db.prepare('INSERT INTO membros_comunidade (comunidade_id, user_id) VALUES (?,?)').run(result.lastInsertRowid, uid);
  res.redirect(`/comunidade/${result.lastInsertRowid}`);
});

router.post('/comunidade/entrar', auth, (req, res) => {
  const { comunidade_id } = req.body;
  try {
    db.prepare('INSERT INTO membros_comunidade (comunidade_id, user_id) VALUES (?,?)').run(comunidade_id, req.session.usuario.id);
  } catch(e) {}
  res.redirect(`/comunidade/${comunidade_id}`);
});

router.post('/comunidade/sair', auth, (req, res) => {
  const { comunidade_id } = req.body;
  db.prepare('DELETE FROM membros_comunidade WHERE comunidade_id=? AND user_id=?').run(comunidade_id, req.session.usuario.id);
  res.redirect(`/comunidade/${comunidade_id}`);
});

router.post('/topico/criar', auth, (req, res) => {
  const { comunidade_id, titulo, texto } = req.body;
  if (!titulo || !texto) return res.redirect('back');
  db.prepare('INSERT INTO topicos (comunidade_id, user_id, titulo, texto) VALUES (?,?,?,?)').run(comunidade_id, req.session.usuario.id, titulo, texto);
  res.redirect(`/comunidade/${comunidade_id}`);
});

router.get('/topico/:id', auth, (req, res) => {
  const topico = db.prepare('SELECT t.*, u.nome as autor FROM topicos t JOIN users u ON u.id=t.user_id WHERE t.id=?').get(req.params.id);
  if (!topico) return res.redirect('/comunidades');
  const respostas = db.prepare('SELECT r.*, u.nome as autor FROM respostas_topico r JOIN users u ON u.id=r.user_id WHERE r.topico_id=? ORDER BY r.created_at').all(topico.id);
  res.render('topico', { topico, respostas });
});

router.post('/topico/responder', auth, (req, res) => {
  const { topico_id, texto } = req.body;
  if (!texto) return res.redirect('back');
  db.prepare('INSERT INTO respostas_topico (topico_id, user_id, texto) VALUES (?,?,?)').run(topico_id, req.session.usuario.id, texto);
  res.redirect(`/topico/${topico_id}`);
});

module.exports = router;
