# 🚀 Guia de Desenvolvimento - TaskManager

> **Objetivo:** Criar uma aplicação completa de gerenciamento de tarefas colaborativo com Node.js, Express, MySQL e Socket.io

---

## 📋 **FASE 1: Configuração Inicial**

### ✅ **1.1 Configurar Variáveis de Ambiente**

- [x] Criar arquivo `.env` na raiz do projeto
- [x] Adicionar as seguintes variáveis:
  ```
  PORT=3000
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=sua_senha
  DB_NAME=taskmanager
  JWT_SECRET=seu_segredo_super_secreto_aqui
  ```
- [x] Criar arquivo `.env.example` (sem valores sensíveis) para outros desenvolvedores

**Por quê?** Variáveis de ambiente mantêm informações sensíveis fora do código e facilitam diferentes configurações (dev, produção).

---

- [x] Criar arquivo `.gitignore` na raiz
- [x] Adicionar ao `.gitignore`:
  ```
  node_modules/
  .env
  .DS_Store
  *.log
  ```

**Por quê?** Evita commitar arquivos desnecessários e sensíveis no Git.

---

### ✅ **1.2 Configurar Banco de Dados**

- [x] Criar pasta `config/` na raiz do projeto
- [x] Criar arquivo `config/database.js`
- [x] Implementar conexão com MySQL usando `mysql2/promise`
- [x] Exportar o pool de conexões

**Dica:** Use `createPool()` ao invés de `createConnection()` para melhor performance.

**Exemplo de estrutura:**
```javascript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

export default pool;
```

---

- [x] Criar pasta `database/` na raiz
- [x] Criar arquivo `database/schema.sql`
- [x] Escrever SQL para criar as tabelas:
  - `users` (id, name, email, password_hash, created_at)
  - `projects` (id, name, description, owner_id, created_at)
  - `tasks` (id, title, description, status, priority, project_id, assigned_to, created_at, updated_at)
  - `project_members` (project_id, user_id, role) - tabela de relacionamento N:N

**Dica:** Use `AUTO_INCREMENT` para IDs e `FOREIGN KEY` para relacionamentos.

---

- [x] Executar o script SQL no MySQL Workbench ou terminal
- [x] Verificar se as tabelas foram criadas corretamente

**Comando terminal:**
```bash
mysql -u root -p taskmanager < database/schema.sql
```

---

## 📋 **FASE 2: Models (Camada de Dados)**

### ✅ **2.1 Criar User Model**

- [x] Criar arquivo `model/userModel.js`
- [x] Importar o pool de conexões do `config/database.js`
- [x] Implementar as seguintes funções:
  - `createUser(name, email, passwordHash)` - INSERT
  - `findUserByEmail(email)` - SELECT WHERE email
  - `findUserById(id)` - SELECT WHERE id
  - `updateUser(id, data)` - UPDATE
  - `deleteUser(id)` - DELETE

**Por quê?** Models isolam a lógica de acesso ao banco de dados.

**Exemplo de função:**
```javascript
export const findUserByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
};
```

---

### ✅ **2.2 Criar Task Model**

- [x] Criar arquivo `model/taskModel.js`
- [x] Implementar funções:
  - `createTask(taskData)` - INSERT
  - `getAllTasks()` - SELECT ALL
  - `getTaskById(id)` - SELECT WHERE id
  - `getTasksByProject(projectId)` - SELECT WHERE project_id
  - `updateTask(id, data)` - UPDATE
  - `updateTaskStatus(id, status)` - UPDATE apenas status
  - `deleteTask(id)` - DELETE

**Dica:** Use prepared statements (?) para evitar SQL Injection.

---

### ✅ **2.3 Criar Project Model**

- [x] Criar arquivo `model/projectModel.js`
- [x] Implementar funções:
  - `createProject(name, description, ownerId)` - INSERT
  - `getAllProjects()` - SELECT ALL
  - `getProjectById(id)` - SELECT WHERE id
  - `getProjectsByUser(userId)` - SELECT com JOIN na tabela project_members
  - `updateProject(id, data)` - UPDATE
  - `deleteProject(id)` - DELETE
  - `addMember(projectId, userId, role)` - INSERT em project_members
  - `removeMember(projectId, userId)` - DELETE de project_members

**Por quê?** Projetos têm relacionamento N:N com usuários (vários usuários em vários projetos).

---

## 📋 **FASE 3: Middlewares**

### ✅ **3.1 Criar Middleware de Autenticação**

- [x] Criar pasta `middlewares/` na raiz
- [x] Criar arquivo `middlewares/authMiddleware.js`
- [x] Implementar função `verifyToken(req, res, next)`
- [x] Verificar se o token JWT está no header `Authorization` ou em cookies
- [x] Decodificar o token usando `jsonwebtoken`
- [x] Adicionar dados do usuário em `req.user`
- [x] Chamar `next()` se válido, ou retornar erro 401

**Por quê?** Protege rotas que precisam de autenticação.

**Exemplo:**
```javascript
import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

---

### ✅ **3.2 Criar Middleware de Validação**

- [x] Criar arquivo `middlewares/validation.js`
- [x] Criar schemas de validação usando Zod:
  - `registerSchema` - valida name, email, password
  - `loginSchema` - valida email, password
  - `taskSchema` - valida title, description, status, etc.
  - `projectSchema` - valida name, description

- [x] Criar função genérica `validate(schema)` que retorna um middleware
- [x] O middleware deve validar `req.body` contra o schema
- [x] Retornar erro 400 se inválido

**Por quê?** Garante que dados enviados estão no formato correto antes de processar.

**Exemplo:**
```javascript
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6)
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
};
```

---

### ✅ **3.3 Criar Middleware de Tratamento de Erros**

- [x] Criar arquivo `middlewares/errorHandler.js`
- [x] Implementar função `errorHandler(err, req, res, next)`
- [x] Logar o erro no console
- [x] Retornar resposta JSON com status apropriado

**Por quê?** Centraliza tratamento de erros e evita crashes do servidor.

---

## 📋 **FASE 4: Controllers (Lógica de Negócio)**

### ✅ **4.1 Criar Auth Controller**

- [x] Criar pasta `controllers/` (corrigir nome da pasta atual `controller `)
- [x] Criar arquivo `controllers/authController.js`
- [x] Implementar função `register`:
  - Receber name, email, password do `req.body`
  - Verificar se email já existe (usar userModel)
  - Fazer hash da senha com `bcrypt.hash(password, 10)`
  - Criar usuário no banco
  - Retornar sucesso (201)

- [x] Implementar função `login`:
  - Receber email, password
  - Buscar usuário por email
  - Comparar senha com `bcrypt.compare(password, user.password_hash)`
  - Gerar JWT com `jwt.sign({ id, email }, SECRET, { expiresIn: '7d' })`
  - Retornar token

- [x] Implementar função `logout`:
  - Limpar cookie (se usar cookies)
  - Retornar sucesso

**Por quê?** Separa lógica de autenticação das rotas.

---

### ✅ **4.2 Criar User Controller**

- [x] Criar arquivo `controllers/userController.js`
- [x] Implementar funções:
  - `getMe(req, res)` - retorna dados do usuário logado (req.user)
  - `getUserById(req, res)` - busca usuário por ID
  - `updateUser(req, res)` - atualiza dados do usuário
  - `deleteUser(req, res)` - deleta usuário

**Dica:** Use try/catch em todas as funções e retorne erros apropriados.

---

### ✅ **4.3 Criar Task Controller**

- [x] Criar arquivo `controllers/taskController.js`
- [x] Implementar funções:
  - `createTask(req, res)` - cria nova tarefa
  - `getAllTasks(req, res)` - lista todas as tarefas
  - `getTaskById(req, res)` - busca tarefa específica
  - `getTasksByProject(req, res)` - tarefas de um projeto
  - `updateTask(req, res)` - atualiza tarefa
  - `updateTaskStatus(req, res)` - atualiza apenas status
  - `deleteTask(req, res)` - deleta tarefa

**IMPORTANTE:** Ao criar/atualizar/deletar tarefa, emitir evento Socket.io para atualização em tempo real!

---

### ✅ **4.4 Criar Project Controller**

- [x] Criar arquivo `controllers/projectController.js`
- [x] Implementar funções:
  - `createProject(req, res)` - cria projeto
  - `getAllProjects(req, res)` - lista projetos do usuário
  - `getProjectById(req, res)` - busca projeto específico
  - `updateProject(req, res)` - atualiza projeto
  - `deleteProject(req, res)` - deleta projeto
  - `addMember(req, res)` - adiciona membro ao projeto
  - `removeMember(req, res)` - remove membro

---

## 📋 **FASE 5: Routes (Rotas da API)**

### ✅ **5.1 Implementar User Routes**

- [x] Abrir arquivo `routes/userRoutes.js`
- [x] Importar express Router
- [x] Importar userController e authMiddleware
- [x] Criar as rotas:
  ```javascript
  GET    /me           → getMe (protegida)
  GET    /:id          → getUserById (protegida)
  PUT    /:id          → updateUser (protegida)
  DELETE /:id          → deleteUser (protegida)
  ```
- [x] Exportar o router

**Exemplo:**
```javascript
import express from 'express';
import { getMe, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/me', verifyToken, getMe);
router.get('/:id', verifyToken, getUserById);
router.put('/:id', verifyToken, updateUser);
router.delete('/:id', verifyToken, deleteUser);

export default router;
```

---

### ✅ **5.2 Criar Auth Routes**

- [x] Criar arquivo `routes/authRoutes.js`
- [x] Importar authController e validation middleware
- [x] Criar rotas:
  ```javascript
  POST /register → register (com validação)
  POST /login    → login (com validação)
  POST /logout   → logout
  ```
- [x] Exportar router

---

### ✅ **5.3 Implementar Task Routes**

- [x] Abrir arquivo `routes/taskRoutes.js`
- [x] Importar taskController, authMiddleware, validation
- [x] Criar rotas:
  ```javascript
  GET    /                    → getAllTasks (protegida)
  GET    /:id                 → getTaskById (protegida)
  GET    /project/:projectId  → getTasksByProject (protegida)
  POST   /                    → createTask (protegida + validação)
  PUT    /:id                 → updateTask (protegida)
  PATCH  /:id/status          → updateTaskStatus (protegida)
  DELETE /:id                 → deleteTask (protegida)
  ```

---

### ✅ **5.4 Implementar Project Routes**

- [x] Abrir arquivo `routes/projectRoutes.js`
- [x] Importar projectController, authMiddleware
- [x] Criar rotas:
  ```javascript
  GET    /                      → getAllProjects (protegida)
  GET    /:id                   → getProjectById (protegida)
  POST   /                      → createProject (protegida)
  PUT    /:id                   → updateProject (protegida)
  DELETE /:id                   → deleteProject (protegida)
  POST   /:id/members           → addMember (protegida)
  DELETE /:id/members/:userId   → removeMember (protegida)
  ```

---

### ✅ **5.5 Atualizar app.js**

- [x] Importar `cookie-parser`
- [x] Importar `authRoutes`
- [x] Importar `errorHandler` middleware
- [x] Adicionar `app.use(cookieParser())`
- [x] Adicionar rota `/auth` → `authRoutes`
- [x] Servir arquivos estáticos da pasta `web`: `app.use(express.static('web'))`
- [x] Adicionar errorHandler no final: `app.use(errorHandler)`

**Exemplo:**
```javascript
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

app.use(cookieParser());
app.use(express.static('web'));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/projects', projectRoutes);

app.use(errorHandler);
```

---

## 📋 **FASE 6: Socket.io (Tempo Real)**

### ✅ **6.1 Configurar Socket.io no Backend**

- [x] Criar pasta `socket/` na raiz
- [x] Criar arquivo `socket/socketHandler.js`
- [x] Importar `Server` do `socket.io`
- [x] Criar função `initSocket(httpServer)` que:
  - Cria instância do Socket.io
  - Configura CORS se necessário
  - Define eventos (connection, disconnect)
  - Retorna a instância `io`

**Exemplo:**
```javascript
import { Server } from 'socket.io';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    socket.on('join-project', (projectId) => {
      socket.join(`project-${projectId}`);
    });

    socket.on('disconnect', () => {
      console.log('Usuário desconectado:', socket.id);
    });
  });

  return io;
};
```

---

- [x] Atualizar `app.js`:
  - Importar `http` nativo do Node
  - Criar servidor HTTP: `const server = http.createServer(app)`
  - Inicializar Socket.io: `const io = initSocket(server)`
  - Exportar `io` para usar nos controllers
  - Mudar `app.listen()` para `server.listen()`

**Exemplo:**
```javascript
import http from 'http';
import { initSocket } from './socket/socketHandler.js';

const server = http.createServer(app);
export const io = initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### ✅ **6.2 Emitir Eventos nos Controllers**

- [x] No `taskController.js`, importar `io` do `app.js`
- [x] Ao criar tarefa: `io.to('project-' + projectId).emit('task-created', task)`
- [x] Ao atualizar tarefa: `io.to('project-' + projectId).emit('task-updated', task)`
- [x] Ao deletar tarefa: `io.to('project-' + projectId).emit('task-deleted', taskId)`

**Por quê?** Todos os usuários no mesmo projeto recebem atualizações instantâneas.

---

## 📋 **FASE 7: Frontend Básico**

### ✅ **7.1 Criar Página de Login/Registro**

- [x] Criar arquivo `web/auth.html`
- [x] Criar formulário de login (email, password)
- [x] Criar formulário de registro (name, email, password)
- [x] Criar arquivo `web/auth.js`
- [x] Fazer requisições POST para `/auth/login` e `/auth/register`
- [x] Salvar token no `localStorage`
- [x] Redirecionar para dashboard após login

---

### ✅ **7.2 Criar Dashboard**

- [x] Atualizar `web/index.html` para ser o dashboard
- [x] Criar arquivo `web/dashboard.js`
- [ ] Verificar se usuário está logado (token no localStorage)
- [ ] Fazer requisição GET `/projects` para listar projetos
- [ ] Exibir lista de projetos na tela
- [ ] Criar formulário para adicionar novo projeto

---

### ✅ **7.3 Criar Visualização de Tarefas**

- [ ] Criar arquivo `web/project.html`
- [ ] Criar arquivo `web/project.js`
- [ ] Buscar tarefas do projeto: GET `/tasks/project/:id`
- [ ] Exibir tarefas em formato de lista ou Kanban
- [ ] Criar formulário para adicionar nova tarefa
- [ ] Permitir editar status da tarefa (arrastar ou botão)

---

### ✅ **7.4 Integrar Socket.io no Frontend**

- [ ] Adicionar script do Socket.io no HTML:
  ```html
  <script src="/socket.io/socket.io.js"></script>
  ```
- [ ] No `project.js`, conectar ao servidor:
  ```javascript
  const socket = io();
  socket.emit('join-project', projectId);
  ```
- [ ] Escutar eventos:
  ```javascript
  socket.on('task-created', (task) => {
    // Adicionar tarefa na tela
  });
  
  socket.on('task-updated', (task) => {
    // Atualizar tarefa na tela
  });
  
  socket.on('task-deleted', (taskId) => {
    // Remover tarefa da tela
  });
  ```

**Por quê?** Atualizações em tempo real sem precisar recarregar a página!

---

### ✅ **7.5 Estilizar com CSS**

- [ ] Criar arquivo `web/styles.css`
- [ ] Adicionar estilos modernos (flexbox, grid)
- [ ] Usar cores agradáveis e design limpo
- [ ] Adicionar responsividade para mobile

**Dica:** Use Google Fonts para tipografia melhor.

---

## 📋 **FASE 8: Testes e Melhorias**

### ✅ **8.1 Testar Funcionalidades**

- [ ] Testar registro de usuário
- [ ] Testar login e geração de token
- [ ] Testar criação de projeto
- [ ] Testar criação de tarefa
- [ ] Testar atualização de tarefa
- [ ] Testar tempo real (abrir em 2 abas e verificar sincronização)
- [ ] Testar rotas protegidas sem token (deve retornar 401)

---

### ✅ **8.2 Melhorias Opcionais**

- [ ] Adicionar paginação nas listagens
- [ ] Adicionar filtros (por status, prioridade)
- [ ] Adicionar busca de tarefas
- [ ] Adicionar notificações visuais (toast)
- [ ] Adicionar indicador de "usuário online"
- [ ] Adicionar avatar de usuário
- [ ] Adicionar data de vencimento nas tarefas

---

## 📋 **FASE 9: Documentação e Deploy**

### ✅ **9.1 Atualizar README.md**

- [ ] Adicionar descrição do projeto
- [ ] Adicionar tecnologias usadas
- [ ] Adicionar instruções de instalação
- [ ] Adicionar instruções de uso
- [ ] Adicionar screenshots (opcional)

---

### ✅ **9.2 Preparar para Deploy (Opcional)**

- [ ] Adicionar script `start` no `package.json`: `"start": "node app.js"`
- [ ] Adicionar script `dev`: `"dev": "nodemon app.js"`
- [ ] Testar em ambiente de produção local
- [ ] Fazer deploy (Railway, Render, Heroku, etc.)

---

## 🎯 **Dicas Gerais**

1. **Teste cada fase antes de avançar** - Não acumule código sem testar
2. **Use console.log()** - Para debugar e entender o fluxo
3. **Leia mensagens de erro** - Elas geralmente dizem o que está errado
4. **Consulte documentação** - Express, MySQL2, Socket.io, JWT
5. **Faça commits frequentes** - `git add .` e `git commit -m "mensagem"`
6. **Não tenha medo de errar** - Erros fazem parte do aprendizado!

---

## 📚 **Recursos Úteis**

- [Express.js Docs](https://expressjs.com/)
- [MySQL2 Docs](https://github.com/sidorares/node-mysql2)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [JWT Docs](https://github.com/auth0/node-jsonwebtoken)
- [Bcrypt Docs](https://github.com/kelektiv/node.bcrypt.js)
- [Zod Docs](https://zod.dev/)

---

## ✅ **Checklist Final**

- [ ] Todas as rotas funcionando
- [ ] Autenticação implementada
- [ ] Banco de dados configurado
- [ ] Socket.io funcionando
- [ ] Frontend básico criado
- [ ] Projeto testado
- [ ] README atualizado
- [ ] Código no GitHub

---

**Boa sorte! 🚀 Você consegue!**

Se tiver dúvidas, consulte a documentação ou pesquise o erro específico. Lembre-se: cada erro é uma oportunidade de aprender algo novo!
