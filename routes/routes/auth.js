const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

router.get('/', (req, res) => {
  if (req.session.usuario) return res.redirect('/inicio');
  res.render('login');
});

router.get('/cadastro', (req, res) => {
  if (req.session.usuario) return res.redirect('/inicio');
  res.render('cadastro', { erro: null });
});

router.post('/cadastro', async (req, res) => {
  const { nome, email, senha, cidade, estado } = req.body;
  if (!nome || !email || !senha) return res.render('cadastro', { erro: 'Preencha todos os campos!' });
  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existe) return res.render('cadastro', { erro: 'Email já cadastrado!' });
  const hash = await bcrypt.hash(senha, 10);
  const result = db.prepare('INSERT INTO users (nome, email, senha, cidade, estado) VALUES (?,?,?,?,?)').run(nome, email, hash, cidade || '', estado || '');
  req.session.usuario = { id: result.lastInsertRowid, nome, email, cidade, estado };
  res.redirect('/inicio');
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.render('login', { erro: 'Email ou senha incorretos!' });
  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) return res.render('login', { erro: 'Email ou senha incorretos!' });
  req.session.usuario = { id: user.id, nome: user.nome, email: user.email, cidade: user.cidade, estado: user.estado };
  res.redirect('/inicio');
});

router.get('/sair', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
