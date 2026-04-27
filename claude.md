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
    └── ranking.ts        # /ranking [tipo] — ranking última partida ou geral
```

---

## Comandos slash

| Comando             | Descrição                                             |
|---------------------|-------------------------------------------------------|
| `/partida [id]`     | Detalhes de uma partida (padrão: última)              |
| `/rank [usuario]`   | Rank individual acumulado (padrão: o próprio usuário) |
| `/ranking [tipo]`   | Ranking `ultima` (padrão) ou `geral` (acumulado)      |

---

## Variáveis de ambiente

| Variável           | Descrição                                                    |
|--------------------|--------------------------------------------------------------|
| `DISCORD_TOKEN`    | Token do bot (Developer Portal → Bot)                        |
| `DISCORD_APP_ID`   | Application ID (Developer Portal → General Information)      |
| `DISCORD_GUILD_ID` | (Opcional) Server ID para registro instantâneo em dev        |
| `API_BASE_URL`     | Base URL da API — default `https://packetloss.com.br`        |
| `USE_MOCK_API`     | `true` para forçar dados de mockup                           |

---

## Rotas de API esperadas no packetloss (Next.js)

Estas rotas ainda **não existem** no site — precisam ser criadas em `src/app/api/`:

| Método | Rota                     | Descrição                                      |
|--------|--------------------------|------------------------------------------------|
| GET    | `/api/matches`           | Lista todas as partidas                        |
| GET    | `/api/matches/last`      | Última partida registrada                      |
| GET    | `/api/matches/[id]`      | Partida específica por ID                      |
| GET    | `/api/rank/[discordId]`  | Rank individual pelo Discord ID do jogador     |
| GET    | `/api/ranking/last`      | Ranking da última partida                      |
| GET    | `/api/ranking/overall`   | Ranking geral acumulado                        |

Enquanto as rotas não existem, o bot usa **mockup estático** definido no topo de `src/api/client.ts`.

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

## Próximos passos

1. Criar as rotas de API no site `packetloss` (Next.js App Router)
2. Definir o schema Drizzle para `matches` e `match_players`
3. Criar endpoints de criação de partida (admin) para popular o banco
4. Desativar o mockup quando as rotas estiverem prontas (`USE_MOCK_API=false`)
5. Adicionar comando `/partidas` para listar histórico paginado
