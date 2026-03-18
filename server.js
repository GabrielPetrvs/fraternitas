const express = require('express');
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { initDb, getDb } = require('./database');
const { prepare } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionMiddleware = session({
  secret: 'fraternitas-secreto-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

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
app.use('/', require('./routes/upload'));

const onlineUsers = {};

io.on('connection', (socket) => {
  const sess = socket.request.session;
  if (!sess || !sess.usuario) return;
  const user = sess.usuario;

  onlineUsers[user.id] = { nome: user.nome, socketId: socket.id };
  io.emit('usuarios-online', Object.keys(onlineUsers).map(id => ({ id, nome: onlineUsers[id].nome })));

  socket.on('entrar-sala', (roomId) => {
    socket.join(roomId);
  });

  socket.on('buscar-historico', (data) => {
    const { roomId, amigoId } = data;
    let historico = [];
    try {
      historico = prepare(`
        SELECT m.*, u.nome as de_nome FROM chat_mensagens m
        JOIN users u ON u.id = m.de_user_id
        WHERE m.room_id = ?
        ORDER BY m.created_at ASC LIMIT 50
      `).all(roomId).map(m => ({
        ...m,
        hora: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));
    } catch(e) {}
    socket.emit('historico-chat', { amigoId, historico });
  });

  socket.on('mensagem-chat', (data) => {
    const { roomId, texto, paraId } = data;
    if (!texto || !texto.trim()) return;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const msg = {
      de_id: user.id,
      para_id: paraId,
      de_nome: user.nome,
      texto: texto.trim(),
      hora
    };
    try {
      prepare('INSERT INTO chat_mensagens (de_user_id, para_user_id, room_id, texto) VALUES (?,?,?,?)').run(
        user.id, paraId, roomId, texto.trim()
      );
    } catch(e) {}
    io.to(roomId).emit('nova-mensagem', msg);
  });

  socket.on('disconnect', () => {
    delete onlineUsers[user.id];
    io.emit('usuarios-online', Object.keys(onlineUsers).map(id => ({ id, nome: onlineUsers[id].nome })));
  });
});

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log('\n✅ Fraternitas rodando em http://localhost:' + PORT + '\n');
  });
}).catch(err => {
  console.error('Erro ao iniciar:', err);
});
