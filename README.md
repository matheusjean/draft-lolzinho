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

### Banco da Vercel

Para deploy, continue usando as variaveis do Postgres da Vercel.

```bash
cd backend
npm install
Copy-Item .env.example .env
npx prisma migrate deploy
npm run seed
npm run dev
```

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

- `DATABASE_URL` para `POSTGRES_PRISMA_URL`
- `DIRECT_URL` para `POSTGRES_URL_NON_POOLING`

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
