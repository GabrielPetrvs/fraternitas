# 🟠 Orkut Clone — Guia Completo de Instalação

Rede social estilo Orkut com: login, scraps, depoimentos, karma e comunidades.

---

## 📦 PASSO 1 — Instalar o Node.js

1. Acesse: https://nodejs.org
2. Baixe a versão **LTS** (botão verde)
3. Instale normalmente (clique em "Next" até o fim)
4. Para verificar que funcionou, abra o **Prompt de Comando** (Windows) ou **Terminal** (Mac/Linux) e digite:
   ```
   node --version
   ```
   Deve aparecer algo como `v20.x.x`

---

## 📁 PASSO 2 — Colocar os arquivos na pasta certa

1. Crie uma pasta chamada `orkut` em algum lugar do seu computador
2. Coloque todos os arquivos do projeto dentro dela (mantendo a estrutura de pastas)

A estrutura deve ficar assim:
```
orkut/
  server.js
  database.js
  package.json
  routes/
    auth.js
    perfil.js
    scraps.js
    amigos.js
    comunidades.js
  views/
    layout.ejs
    login.ejs
    cadastro.ejs
    inicio.ejs
    perfil.ejs
    amigos.ejs
    buscar.ejs
    comunidades.ejs
    comunidade.ejs
    topico.ejs
    depoimento.ejs
  public/
    css/
      style.css
```

---

## ⚙️ PASSO 3 — Instalar as dependências

1. Abra o **Prompt de Comando** (Windows: aperte `Win + R`, digite `cmd`, Enter)
2. Navegue até a pasta do projeto:
   ```
   cd C:\Users\SeuNome\orkut
   ```
   *(ajuste o caminho conforme onde você salvou)*
3. Instale as dependências:
   ```
   npm install
   ```
   Aguarde terminar (pode demorar 1-2 minutos)

---

## ▶️ PASSO 4 — Rodar o servidor

Ainda no Prompt de Comando, dentro da pasta `orkut`:
```
node server.js
```

Você verá:
```
✅ Orkut rodando em http://localhost:3000
```

Agora abra o navegador e acesse: **http://localhost:3000**

---

## 🌍 PASSO 5 — Colocar na internet para seus amigos acessarem

Para que seus amigos acessem, você precisa hospedar na internet. O serviço mais fácil e **gratuito** é o **Railway**.

### Como hospedar no Railway (gratuito):

1. Acesse https://railway.app e crie uma conta (pode usar Google)

2. Instale o Git se não tiver: https://git-scm.com/downloads

3. Abra o Prompt de Comando na pasta `orkut` e execute:
   ```
   git init
   git add .
   git commit -m "meu orkut"
   ```

4. No Railway, clique em **"New Project"** → **"Deploy from GitHub"**
   - Conecte sua conta GitHub
   - Crie um repositório e envie os arquivos:
     ```
     git remote add origin https://github.com/SEU_USUARIO/orkut.git
     git push -u origin main
     ```

5. O Railway vai detectar o projeto automaticamente e gerar um link como:
   `https://orkut-production-xxxx.up.railway.app`

6. Envie esse link para seus amigos — pronto!

---

## 🛠️ Dica extra — Rodar em modo desenvolvimento (reinicia automaticamente)

```
npm run dev
```

---

## ❓ Problemas comuns

**"node não é reconhecido"** → Node.js não foi instalado corretamente. Reinstale e reinicie o computador.

**"Cannot find module"** → Você esqueceu de rodar `npm install`. Rode na pasta do projeto.

**Porta 3000 ocupada** → Mude no final do `server.js`: troque `3000` por `3001` e acesse `http://localhost:3001`

---

## 🎉 Funcionalidades incluídas

- ✅ Cadastro e login com senha criptografada
- ✅ Perfil com foto (iniciais), sobre mim, cidade/estado
- ✅ Karma: confiabilidade, criatividade e sexualidade (via depoimentos)
- ✅ Scraps (mural de recados entre amigos)
- ✅ Depoimentos com estrelinhas
- ✅ Comunidades com tópicos e respostas
- ✅ Sistema de amizade (adicionar, aceitar, recusar)
- ✅ Busca de pessoas
- ✅ Notificações de solicitações de amizade na página inicial
