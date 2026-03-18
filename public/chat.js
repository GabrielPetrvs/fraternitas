(function() {
  const socket = io();
  const meuId = window.FRATERNITAS_USER_ID;
  const meuNome = window.FRATERNITAS_USER_NOME;
  if (!meuId) return;

  const openChats = {};

  // Create chat bar
  const bar = document.createElement('div');
  bar.id = 'chat-bar';
  bar.innerHTML = `
    <div id="chat-bar-header" onclick="toggleChatBar()">
      <span id="chat-bar-title">💬 chat (<span id="chat-online-count">0</span> online)</span>
      <span id="chat-bar-arrow">▲</span>
    </div>
    <div id="chat-bar-list"></div>
  `;
  document.body.appendChild(bar);

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #chat-bar {
      position: fixed; bottom: 0; right: 20px; width: 200px;
      background: linear-gradient(to bottom, #d4a843, #8b6914);
      border-radius: 6px 6px 0 0; z-index: 9999;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.2); font-family: Arial, sans-serif;
    }
    #chat-bar-header {
      padding: 7px 10px; cursor: pointer; display: flex;
      justify-content: space-between; align-items: center;
      color: white; font-size: 12px; font-weight: bold; user-select: none;
    }
    #chat-bar-list { background: white; max-height: 220px; overflow-y: auto; display: block; }
    .chat-bar-user {
      padding: 7px 10px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #f0e8cc;
      display: flex; align-items: center; gap: 6px; color: #333;
    }
    .chat-bar-user:hover { background: #fffdf0; }
    .chat-bar-user .dot { width: 8px; height: 8px; border-radius: 50%; background: #4caf50; flex-shrink: 0; }
    .chat-bar-user .unread { background: #c9a84c; color: white; border-radius: 10px; font-size: 10px; padding: 1px 5px; margin-left: auto; }
    .chat-window {
      position: fixed; bottom: 0; width: 260px; z-index: 9998;
      background: white; border: 1px solid #c9a84c; border-radius: 6px 6px 0 0;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.15); font-family: Arial, sans-serif;
      display: flex; flex-direction: column;
    }
    .chat-window-header {
      background: linear-gradient(to bottom, #d4a843, #8b6914);
      color: white; padding: 6px 10px; font-size: 12px; font-weight: bold;
      border-radius: 6px 6px 0 0; display: flex; justify-content: space-between;
      align-items: center; cursor: pointer; user-select: none;
    }
    .chat-window-header .close-btn {
      cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px;
    }
    .chat-window-messages {
      height: 220px; overflow-y: auto; padding: 8px;
      background: #fffdf8; font-size: 12px;
    }
    .chat-window-msg { margin-bottom: 8px; }
    .chat-window-msg .balao {
      display: inline-block; padding: 5px 9px; border-radius: 10px;
      max-width: 85%; word-break: break-word; font-size: 12px; line-height: 1.4;
    }
    .chat-window-msg.meu { text-align: right; }
    .chat-window-msg.meu .balao { background: linear-gradient(135deg,#d4a843,#8b6914); color: white; border-radius: 10px 10px 2px 10px; }
    .chat-window-msg.deles .balao { background: #f0e8cc; color: #333; border-radius: 10px 10px 10px 2px; }
    .chat-window-msg .hora { font-size: 10px; color: #aaa; display: block; margin-top: 2px; }
    .chat-window-input-area {
      display: flex; border-top: 1px solid #e8d898; background: white;
    }
    .chat-window-input-area input {
      flex: 1; border: none; padding: 7px 8px; font-size: 12px;
      outline: none; background: transparent; font-family: Arial, sans-serif;
    }
    .chat-window-input-area button {
      background: #8b6914; color: white; border: none; padding: 0 10px;
      cursor: pointer; font-size: 12px; border-radius: 0 0 0 0;
    }
    .chat-window-input-area button:hover { background: #6b4f10; }
    .chat-empty { text-align: center; color: #aaa; font-size: 11px; padding: 20px 10px; }
  `;
  document.head.appendChild(style);

  let barOpen = true;
  window.toggleChatBar = function() {
    barOpen = !barOpen;
    document.getElementById('chat-bar-list').style.display = barOpen ? 'block' : 'none';
    document.getElementById('chat-bar-arrow').textContent = barOpen ? '▲' : '▼';
  };

  socket.on('usuarios-online', function(users) {
    const list = document.getElementById('chat-bar-list');
    const others = users.filter(function(u) { return String(u.id) !== String(meuId); });
    document.getElementById('chat-online-count').textContent = others.length;
    if (others.length === 0) {
      list.innerHTML = '<div class="chat-empty">nenhum amigo online</div>';
      return;
    }
    list.innerHTML = '';
    others.forEach(function(u) {
      const div = document.createElement('div');
      div.className = 'chat-bar-user';
      div.innerHTML = '<span class="dot"></span><span>' + u.nome.split(' ')[0] + '</span>';
      if (openChats[u.id] && openChats[u.id].unread > 0) {
        div.innerHTML += '<span class="unread">' + openChats[u.id].unread + '</span>';
      }
      div.onclick = function() { openChatWindow(u.id, u.nome); };
      list.appendChild(div);
    });
  });

  function getRoomId(otherId) {
    const ids = [parseInt(meuId), parseInt(otherId)].sort(function(a,b){return a-b;});
    return ids[0] + '_' + ids[1];
  }

  function openChatWindow(userId, userName) {
    if (openChats[userId] && openChats[userId].el) {
      openChats[userId].el.style.display = 'flex';
      repositionWindows();
      return;
    }

    const win = document.createElement('div');
    win.className = 'chat-window';
    win.id = 'chat-win-' + userId;
    win.innerHTML = `
      <div class="chat-window-header" onclick="toggleChatWindow('${userId}')">
        <span>${userName.split(' ')[0]}</span>
        <span class="close-btn" onclick="closeChatWindow(event,'${userId}')">✕</span>
      </div>
      <div class="chat-window-messages" id="chat-msgs-${userId}">
        <div class="chat-empty">carregando...</div>
      </div>
      <div class="chat-window-input-area">
        <input type="text" id="chat-inp-${userId}" placeholder="mensagem..." onkeydown="chatKeydown(event,'${userId}','${userName}')">
        <button onclick="sendChat('${userId}','${userName}')">➤</button>
      </div>
    `;
    document.body.appendChild(win);

    openChats[userId] = { el: win, open: true, unread: 0 };

    const roomId = getRoomId(userId);
    socket.emit('entrar-sala', roomId);
    socket.emit('buscar-historico', { roomId: roomId, amigoId: userId });

    repositionWindows();
  }

  window.toggleChatWindow = function(userId) {
    const msgs = document.getElementById('chat-msgs-' + userId);
    const inp = document.querySelector('#chat-win-' + userId + ' .chat-window-input-area');
    if (!msgs) return;
    const isOpen = msgs.style.display !== 'none';
    msgs.style.display = isOpen ? 'none' : 'block';
    if (inp) inp.style.display = isOpen ? 'none' : 'flex';
    if (openChats[userId]) openChats[userId].open = !isOpen;
  };

  window.closeChatWindow = function(e, userId) {
    e.stopPropagation();
    const win = document.getElementById('chat-win-' + userId);
    if (win) win.remove();
    delete openChats[userId];
    repositionWindows();
  };

  window.chatKeydown = function(e, userId, userName) {
    if (e.key === 'Enter') sendChat(userId, userName);
  };

  window.sendChat = function(userId, userName) {
    const inp = document.getElementById('chat-inp-' + userId);
    if (!inp) return;
    const texto = inp.value.trim();
    if (!texto) return;
    const roomId = getRoomId(userId);
    socket.emit('mensagem-chat', { roomId: roomId, texto: texto, paraId: userId });
    inp.value = '';
    inp.focus();
  };

  socket.on('nova-mensagem', function(msg) {
    const otherId = String(msg.de_id) === String(meuId) ? msg.para_id : msg.de_id;
    const msgs = document.getElementById('chat-msgs-' + otherId);
    if (msgs) {
      // Remove empty state
      const empty = msgs.querySelector('.chat-empty');
      if (empty) empty.remove();
      const div = document.createElement('div');
      div.className = 'chat-window-msg ' + (String(msg.de_id) === String(meuId) ? 'meu' : 'deles');
      div.innerHTML = '<div class="balao">' + msg.texto + '</div><span class="hora">' + msg.hora + '</span>';
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      if (openChats[otherId]) openChats[otherId].unread = 0;
    } else if (String(msg.de_id) !== String(meuId)) {
      // Message from someone without open window
      if (!openChats[msg.de_id]) openChats[msg.de_id] = { unread: 0 };
      openChats[msg.de_id].unread = (openChats[msg.de_id].unread || 0) + 1;
    }
  });

  socket.on('historico-chat', function(data) {
    const msgs = document.getElementById('chat-msgs-' + data.amigoId);
    if (!msgs) return;
    msgs.innerHTML = '';
    if (data.historico.length === 0) {
      msgs.innerHTML = '<div class="chat-empty">início da conversa 🕊️</div>';
      return;
    }
    data.historico.forEach(function(m) {
      const div = document.createElement('div');
      div.className = 'chat-window-msg ' + (String(m.de_user_id) === String(meuId) ? 'meu' : 'deles');
      div.innerHTML = '<div class="balao">' + m.texto + '</div><span class="hora">' + m.hora + '</span>';
      msgs.appendChild(div);
    });
    msgs.scrollTop = msgs.scrollHeight;
  });

  function repositionWindows() {
    const winEls = document.querySelectorAll('.chat-window');
    let right = 230;
    winEls.forEach(function(w) {
      w.style.right = right + 'px';
      w.style.bottom = '0';
      right += 270;
    });
  }
})();
