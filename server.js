const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./database');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'fraternitas-secreto-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/perfil'));
app.use('/', require('./routes/scraps'));
app.use('/', require('./routes/comunidades'));
app.use('/', require('./routes/amigos'));
app.use('/', require('./routes/intencoes'));

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n✅ Orkut rodando em http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Erro ao iniciar banco de dados:', err);
});
