# packetrank

Bot Discord para o site [packetloss.com.br](https://packetloss.com.br) — exibe estatísticas de partidas, rank individual e rankings gerais diretamente em canais Discord via slash commands.

---

## Stack

- **Node.js** ≥ 20
- **discord.js** v14 (slash commands, embeds)
- **TypeScript** + `tsx` (execução direta em dev)
- **dotenv** — carregamento de variáveis de ambiente
- **pnpm**

---

## Estrutura do projeto

```
packetrank/
├── src/
│   ├── index.ts               # Entry point: inicializa o client e registra os comandos
│   ├── api/
│   │   ├── client.ts          # Funções de fetch para a API do packetloss + mockup
│   │   └── types.ts           # Tipagens TypeScript compartilhadas
│   └── commands/
│       ├── partida.ts         # /partida — detalhes de uma partida
│       ├── rank.ts            # /rank — rank individual de um jogador
│       └── ranking.ts         # /ranking — ranking geral (última partida ou acumulado)
├── .env.example               # Variáveis de ambiente necessárias
├── tsconfig.json
└── package.json
```

---

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```env
# ID da aplicação Discord (Developer Portal → General Information → Application ID)
DISCORD_APP_ID=

# Token do bot (Developer Portal → Bot → Token)
DISCORD_TOKEN=

# (Opcional) ID do servidor para registro instantâneo de slash commands em dev
DISCORD_GUILD_ID=

# URL base da API do site
API_BASE_URL=https://packetloss.com.br

# "true" para usar dados de mockup mesmo com API_BASE_URL definida
USE_MOCK_API=false
```

> **Dica de desenvolvimento:** defina `DISCORD_GUILD_ID` com o ID do seu servidor de testes para que os slash commands apareçam instantaneamente, sem a espera de até 1 hora do registro global.

---

## Instalação e execução

```bash
pnpm install

# Desenvolvimento (hot-reload via tsx)
pnpm dev

# Build TypeScript
pnpm build

# Produção (após build)
pnpm start

# Verificação de tipos
pnpm check
```

---

## Comandos disponíveis

### `/partida [id]`

Exibe os detalhes de uma partida.

| Opção | Tipo   | Obrigatório | Descrição                                           |
|-------|--------|-------------|-----------------------------------------------------|
| `id`  | string | não         | ID da partida. Se omitido, exibe a última partida.  |

**Exemplo de embed retornado:**
```
🎮 Partida #match-001 — de_dust2
Modo: Competitivo | Resultado: Time 1 venceu (16–12)

📊 Jogadores
🥇 Fenrir  — Score: 180 | K/D: 2.00 | 28/14/6
🥈 Nexus   — Score: 140 | K/D: 1.22 | 22/18/9
🥉 Axiom   — Score: 118 | K/D: 0.95 | 19/20/5
4. Volt    — Score: 95  | K/D: 0.68 | 15/22/7
```

---

### `/rank [usuario]`

Exibe o rank individual acumulado de um jogador.

| Opção     | Tipo | Obrigatório | Descrição                                         |
|-----------|------|-------------|---------------------------------------------------|
| `usuario` | user | não         | Mencione o jogador. Se omitido, exibe o seu rank. |

**Informações exibidas:** posição geral, score acumulado, último score, vitórias, derrotas, win rate, kills, deaths, assists, K/D.

---

### `/ranking [tipo]`

Exibe o ranking geral de jogadores.

| Opção  | Tipo   | Obrigatório | Valores                       |
|--------|--------|-------------|-------------------------------|
| `tipo` | choice | não         | `ultima` (padrão) · `geral`   |

- **`ultima`** — ranking baseado nos scores da última partida registrada.
- **`geral`** — ranking acumulado com todas as partidas, incluindo win rate.

---

## Integração com a API do packetloss

O bot consome as seguintes rotas HTTP da aplicação Next.js:

| Método | Rota                     | Descrição                                      |
|--------|--------------------------|------------------------------------------------|
| GET    | `/api/matches`           | Lista todas as partidas                        |
| GET    | `/api/matches/last`      | Retorna a última partida                       |
| GET    | `/api/matches/:id`       | Retorna uma partida específica por ID          |
| GET    | `/api/rank/:discordId`   | Rank individual pelo Discord ID do jogador     |
| GET    | `/api/ranking/last`      | Ranking da última partida                      |
| GET    | `/api/ranking/overall`   | Ranking geral acumulado                        |

> As rotas ainda estão em desenvolvimento no site. Enquanto não existem, o bot usa **dados de mockup** automáticos (ative com `USE_MOCK_API=true` ou simplesmente não defina `API_BASE_URL`).

### Formato esperado das respostas

#### `GET /api/matches/last` → `Match`

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
  players: Array<{
    player: { id: string; discordId: string; name: string; avatar?: string }
    kills: number
    deaths: number
    assists: number
    score: number
    team: 'team1' | 'team2'
  }>
}
```

#### `GET /api/rank/:discordId` → `PlayerRank`

```ts
{
  player: { id: string; discordId: string; name: string; avatar?: string }
  rank: number
  score: number
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

#### `GET /api/ranking/last` → `LastMatchRanking`

```ts
{
  matchId: string
  map: string
  playedAt: string    // ISO 8601
  entries: Array<{
    rank: number
    player: { id: string; discordId: string; name: string }
    score: number
    kills: number
    deaths: number
    assists: number
    kd: number
  }>
}
```

#### `GET /api/ranking/overall` → `OverallRanking`

```ts
{
  totalMatches: number
  updatedAt: string   // ISO 8601
  entries: Array<{
    rank: number
    player: { id: string; discordId: string; name: string }
    score: number
    kills: number
    deaths: number
    assists: number
    kd: number
    wins: number
    losses: number
    winRate: number
  }>
}
```

---

## Configurando o bot no Discord Developer Portal

1. Acesse [discord.com/developers/applications](https://discord.com/developers/applications)
2. Crie uma nova aplicação ou selecione a existente
3. Em **Bot**, copie o **Token**
4. Em **General Information**, copie o **Application ID**
5. Para convidar o bot ao servidor:
   ```
   https://discord.com/oauth2/authorize?client_id=SEU_APP_ID&permissions=2147485696&scope=bot%20applications.commands
   ```

---

## Adicionando novos comandos

1. Crie `src/commands/meu-comando.ts` exportando `data` (SlashCommandBuilder) e `execute`
2. Importe e adicione no array de comandos em `src/index.ts`
3. Na próxima inicialização, o comando é registrado automaticamente

---

## Links

- Site: [packetloss.com.br](https://packetloss.com.br)
- Repositório do site: [github.com/sistematico/packetloss](https://github.com/sistematico/packetloss)
