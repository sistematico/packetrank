# CLAUDE.md — packetrank

Instruções e contexto para o agente de IA sobre este projeto.

---

## O que é este projeto

**packetrank** é um bot Discord escrito em TypeScript que consome a API REST do site [packetloss.com.br](https://packetloss.com.br) (repositório: [github.com/sistematico/packetloss](https://github.com/sistematico/packetloss)) e exibe informações de partidas e rankings em canais Discord via slash commands.

---

## Repositório relacionado (site)

| Propriedade     | Valor                                              |
|-----------------|----------------------------------------------------|
| Repo            | https://github.com/sistematico/packetloss          |
| Framework       | Next.js 16 (App Router) + React 19                 |
| Auth            | NextAuth v5 via Discord OAuth                      |
| Banco de dados  | Drizzle ORM + SQLite (libSQL)                      |
| URL de produção | https://packetloss.com.br                          |

---

## Arquitetura do bot

```
src/
├── bot.ts              # Client Discord.js, registro de comandos no startup
├── api/
│   ├── client.ts         # Fetch das rotas do packetloss + fallback para mockup
│   └── types.ts          # Interfaces TypeScript: Match, PlayerRank, etc.
└── commands/
    ├── partida.ts        # /partida [id] — detalhes de partida
    ├── rank.ts           # /rank [usuario] — rank individual
    ├── ranking.ts        # /ranking [tipo] — ranking última partida ou geral
    ├── nova-partida.ts   # /nova-partida — registra partida (requer permissão)
    └── recrutar.ts       # /recrutar — candidatura ao clan
```

---

## Comandos slash

| Comando             | Descrição                                             |
|---------------------|-------------------------------------------------------|
| `/partida [id]`     | Detalhes de uma partida (padrão: última)              |
| `/rank [usuario]`   | Rank individual acumulado (padrão: o próprio usuário) |
| `/ranking [tipo]`   | Ranking `ultima` (padrão) ou `geral` (acumulado)      |
| `/nova-partida`     | Registra partida de Among Us (requer permissão)       |
| `/recrutar`         | Candidata-se ao clan Packet Loss                      |

### `/recrutar` — Recrutamento

Permite que qualquer membro do servidor Discord candidate-se ao clan Packet Loss sem precisar acessar o site.

**Fluxo:**
1. Usuário executa `/recrutar`
2. Se já houver candidatura, exibe o status atual
3. Caso contrário, abre modal com a ficha de candidatura
4. Após submit, dados são enviados para `POST /api/bot/recrutamento` no site
5. Bot responde com embed de confirmação

**Campos do modal:**
- Nick no Among Us (obrigatório)
- Idade (obrigatório)
- Disponibilidade semanal (obrigatório)
- Experiência com Among Us (obrigatório)
- Por que quer entrar no clan (obrigatório)

**Permissão:** Qualquer usuário (não requer cargo especial).

---

## Variáveis de ambiente

| Variável           | Descrição                                                    |
|--------------------|--------------------------------------------------------------|
| `DISCORD_TOKEN`    | Token do bot (Developer Portal → Bot)                        |
| `DISCORD_APP_ID`   | Application ID (Developer Portal → General Information)      |
| `DISCORD_GUILD_ID` | (Opcional) Server ID para registro instantâneo em dev        |
| `API_BASE_URL`     | Base URL da API — default `https://packetloss.com.br`        |
| `USE_MOCK_API`     | `true` para forçar dados de mockup                           |
| `API_TOKEN`        | Token Bearer para rotas POST autenticadas (`/api/bot/partida`, `/api/bot/recrutamento`) |
| `ALLOWED_ROLE_ID`  | IDs de cargo Discord com permissão para `/nova-partida` (separados por vírgula) |
| `ALLOWED_USER_IDS` | IDs de usuário Discord com permissão para `/nova-partida` (separados por vírgula) |

---

## Rotas de API disponíveis no packetloss (Next.js)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/bot/rankings` | — | Ranking total e semanal de todos os players |
| GET | `/api/bot/rank?player=<nick>` | — | Rank individual por nick |
| GET | `/api/bot/partidas` | — | Lista todas as sessões de campeonato |
| GET | `/api/bot/partida` | — | Próxima sessão agendada |
| POST | `/api/bot/partida` | Bearer token | Registra partida de Among Us |
| GET | `/api/bot/recrutamento?discordId=<id>` | — | Consulta status de candidatura |
| POST | `/api/bot/recrutamento` | Bearer token | Envia candidatura ao clan |

O bot usa **mockup estático** (`USE_MOCK_API=true`) apenas para as rotas de partida/ranking quando a API não está disponível. As rotas de recrutamento nunca usam mockup.

---

## Tipos principais

### `Match`
```ts
{
  id: string
  map: string
  mode: string
  startedAt: string   // ISO 8601
  endedAt: string     // ISO 8601
  team1Score: number
  team2Score: number
  winner: 'team1' | 'team2' | 'draw'
  players: MatchPlayer[]
}
```

### `MatchPlayer`
```ts
{
  player: Player       // { id, discordId, name, avatar? }
  kills: number
  deaths: number
  assists: number
  score: number
  team: 'team1' | 'team2'
}
```

### `PlayerRank`
```ts
{
  player: Player
  rank: number
  score: number        // acumulado
  wins: number
  losses: number
  kills: number
  deaths: number
  assists: number
  kd: number
  winRate: number
  lastMatchScore: number
}
```

### `LastMatchRanking`
```ts
{
  matchId: string
  map: string
  playedAt: string
  entries: RankingEntry[]
}
```

### `OverallRanking`
```ts
{
  totalMatches: number
  updatedAt: string
  entries: (RankingEntry & { wins: number; losses: number; winRate: number })[]
}
```

---

## Comandos de desenvolvimento

```bash
pnpm install        # instala dependências
pnpm dev            # inicia com hot-reload (tsx watch)
pnpm build          # compila TypeScript → dist/
pnpm start          # executa o build compilado
pnpm check          # verifica tipos sem compilar
```

---

## Convenções de código

- TypeScript estrito (`strict: true`)
- ESM nativo (`"type": "module"`, imports com `.js`)
- Todos os comandos usam `interaction.deferReply()` antes de chamadas de API
- Erros de API retornam mensagem de aviso ao usuário sem expor stack trace
- Dados de mockup vivem em `src/api/client.ts` no topo do arquivo

---

## Tipos de recrutamento

### `SubmitRecruitment`
```ts
{
  discordId: string
  nick: string
  age: string
  availability: string
  experience: string
  motivation: string
  referral?: string
}
```

### `RecruitmentApplication`
```ts
{
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  nick: string
  createdAt: string | null
  reviewedAt: string | null
  notes: string | null
}
```
