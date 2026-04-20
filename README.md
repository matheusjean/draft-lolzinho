# draft-lolzinho

App web para montar times de LoL com draft manual, roleta automatica e sorteio rapido.

## Como rodar

```bash
npm install
npm run db:up
npm run dev:backend
npm run dev
```

O front agora ja esta integrado com o backend. Em desenvolvimento, o Vite faz proxy de `/api` para `http://localhost:3333`.

Fluxo atual do front:

- o app abre sem bloquear em login
- o login fica em um botao no header
- o botao `Cadastro de jogador` aparece apenas quando voce entra com `matheusjean11@gmail.com`
- somente esse email consegue criar player no backend

## Build

```bash
npm run build
```

## Backend

O backend NestJS fica em `backend/` e foi preparado para Prisma + PostgreSQL da Vercel.

### Banco local com Docker + DBeaver

Suba o Postgres local:

```bash
docker compose up -d
```

Se aparecer erro com `dockerDesktopLinuxEngine`, abra o Docker Desktop primeiro e espere ele iniciar.

Ou pela raiz do projeto:

```bash
npm run db:up
```

Para usar o backend local com esse banco, no PowerShell:

```powershell
Copy-Item backend\.env.docker.example backend\.env
```

Depois rode:

```bash
cd backend
npx prisma migrate deploy
npm run seed
npm run dev
```

Conexao no DBeaver:

- Host: `localhost`
- Port: `5432`
- Database: `sorteio_dev`
- User: `sorteio`
- Password: `sorteio123`

Se quiser ver status/logs do container:

```bash
npm run db:ps
npm run db:logs
```

Para desligar:

```bash
npm run db:down
```

### Deploy na Vercel

O projeto foi ajustado para aceitar automaticamente estas variaveis da integracao Prisma/Vercel, caso elas existam no ambiente:

- `draft_PRISMA_DATABASE_URL`
- `draft_DATABASE_URL`
- `draft_POSTGRES_URL`

Se `DATABASE_URL` e `DIRECT_URL` nao estiverem definidas, o backend e o Prisma CLI agora fazem fallback para essas variaveis prefixadas.

Tambem foi configurado um `vercel-build` no backend que:

- roda `prisma generate`
- roda `prisma migrate deploy` automaticamente apenas em `production`
- faz o build do Nest

Na raiz do projeto agora existe uma Vercel Function catch-all em `api/[[...path]].ts`, entao voce pode fazer deploy em **um unico projeto da Vercel**:

- frontend na mesma URL principal
- backend atendendo em `/api/*`

Exemplo:

- front: `https://seu-app.vercel.app`
- api: `https://seu-app.vercel.app/api/health`

Se quiser impedir migrations automaticas em producao, defina:

```env
SKIP_PRISMA_MIGRATE=1
```

Se quiser forcar migrations tambem em preview:

```env
AUTO_APPLY_MIGRATIONS=true
```

#### Projeto unico na Vercel

Use a **raiz do repositorio** como `Root Directory`.

O projeto ja tem `vercel.json` na raiz com:

- `buildCommand: npm run vercel-build`
- `outputDirectory: dist`
- configuracao das funcoes em `/api`

Variaveis recomendadas no painel:

- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `LOGIN_CODE_TTL_MINUTES=15`
- `NODE_ENV=production`
- `CORS_ORIGIN=https://SEU-APP.vercel.app`

Se a integracao da Vercel/Prisma ja criou `draft_PRISMA_DATABASE_URL`, `draft_DATABASE_URL` e `draft_POSTGRES_URL`, voce nao precisa renomear nada para o app funcionar.

Se quiser deixar explicito no painel, pode criar tambem:

- `DATABASE_URL=<valor de draft_PRISMA_DATABASE_URL>`
- `DIRECT_URL=<valor de draft_POSTGRES_URL>`

Se quiser, pode deixar o frontend usar a mesma origem e nao precisa nem criar `VITE_API_URL`, porque o app ja faz fallback para `/api`.

#### Primeiro deploy

1. Crie um projeto unico na Vercel apontando para a raiz do repo.
2. Configure as variaveis de ambiente.
3. Faça o primeiro deploy.
4. Verifique `GET /api/health`.
5. Rode o seed apenas se quiser criar o admin em um banco vazio:

```bash
cd backend
npm run seed
```

Se voce pretende migrar os dados do banco local para producao, importe primeiro `User`, `Player`, `Match` e `MatchParticipant`, e nao precisa rodar seed.

### Deploy estilo Railway

Tambem existe suporte ao mesmo modelo usado no `farmais-backoffice`: um unico processo Nest serve a API e tambem entrega o front buildado.

Nesse modo:

- `npm run build:railway` builda o front em `dist/`, gera o Prisma Client, aplica migrations e builda o backend
- `npm run start:railway` sobe `node backend/dist/src/main.js`
- o Nest serve `dist/index.html` para rotas do front
- `/api/*` continua reservado para o backend

O arquivo `railway.json` ja aponta:

- `buildCommand`: `npm run build:railway`
- `startCommand`: `npm run start:railway`
- `healthcheckPath`: `/api/health`

Nesse deploy, nao precisa configurar `VITE_API_URL`, porque o front chama `/api` na mesma origem.

Rotas base:

- `GET /api/health`
- `POST /api/auth/request-code`
- `POST /api/auth/verify-code`
- `GET /api/auth/me`
- `GET /api/matches`
- `POST /api/matches`
- `GET /api/players`
- `POST /api/players`
- `POST /api/players/sync`
- `GET /api/players/:id`

Para Vercel, use `backend/` como Root Directory do projeto do backend e aponte:

Observacao: em desenvolvimento o `request-code` devolve o codigo no JSON. Em producao, por enquanto, o codigo fica nos logs do backend.

Modelagem dos jogadores:

- `Match` continua guardando o snapshot JSON de `blueTeam` e `redTeam`.
- `Player` guarda um registro unico por invocador, incluindo `playerImg` em base64.
- `MatchParticipant` guarda o historico completo do que cada player jogou em cada partida.

Se voce ja tiver partidas gravadas antes dessa modelagem, rode tambem:

```bash
cd backend
npm run backfill:players
```

Fluxo atual do app:

- login por codigo usando `POST /api/auth/request-code` e `POST /api/auth/verify-code`
- cadastro de jogador separado do draft
- apenas `matheusjean11@gmail.com` pode criar player
- autocomplete de players vindo do backend
- `playerImg` salvo em base64 na tabela `Player`
- salvamento da partida completa no backend com data, patch, notas, vencedor, campeoes e rotas
