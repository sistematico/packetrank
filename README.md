# packetrank

Bot Discord para o site [packetloss.com.br](https://packetloss.com.br) — exibe estatísticas de partidas, rank individual, rankings gerais e gerencia o recrutamento do clan diretamente via slash commands.

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
│   ├── bot.ts               # Entry point: inicializa o client e registra os comandos
│   ├── api/
│   │   ├── client.ts          # Funções de fetch para a API do packetloss + mockup
│   │   └── types.ts           # Tipagens TypeScript compartilhadas
│   └── commands/
│       ├── partida.ts         # /partida — detalhes de uma partida
│       ├── rank.ts            # /rank — rank individual de um jogador
│       ├── ranking.ts         # /ranking — ranking geral (última partida ou acumulado)
│       ├── nova-partida.ts    # /nova-partida — registra partida (requer permissão)
│       └── recrutar.ts        # /recrutar — candidatura ao clan
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

# Token de autenticação enviado no header Authorization: Bearer <token>
API_TOKEN=

# ID do cargo Discord que pode usar /nova-partida (além do owner)
ALLOWED_ROLE_ID=

# IDs de usuários Discord que podem usar /nova-partida (separados por vírgula)
ALLOWED_USER_IDS=
```

> **Dica de desenvolvimento:** defina `DISCORD_GUILD_ID` com o ID do seu servidor de testes para que os slash commands apareçam instantaneamente, sem a espera de até 1 hora do registro global.

### Como obter o `ALLOWED_ROLE_ID`

`ALLOWED_ROLE_ID` é o ID de um cargo (role) do seu servidor Discord que terá permissão para usar `/nova-partida`. O owner do servidor **sempre** tem permissão, independentemente dessa variável.

**Passo a passo:**

1. No Discord, vá em **Configurações do usuário → Avançado** e ative o **Modo desenvolvedor**.
2. Acesse as configurações do seu servidor → **Cargos**.
3. Clique com o botão direito no cargo desejado (ex: `Admin`, `Moderador`) → **Copiar ID do cargo**.
4. Cole esse valor em `ALLOWED_ROLE_ID` no seu `.env`:
   ```env
   ALLOWED_ROLE_ID=123456789012345678
   ```

> Se `ALLOWED_ROLE_ID` não for definido, apenas o owner do servidor poderá usar `/nova-partida`.
>
> Para múltiplos cargos, separe os IDs por vírgula: `ALLOWED_ROLE_ID=111111111,222222222`

### Ativar o Server Members Intent

O bot usa o **Server Members Intent** (intent privilegiado) para verificar os cargos dos membros. Sem ele, usuários com `ALLOWED_ROLE_ID` não conseguirão usar `/nova-partida`.

**Passo a passo:**

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications) e selecione sua aplicação.
2. No menu lateral, clique em **Bot**.
3. Role até a seção **Privileged Gateway Intents**.
4. Ative **Server Members Intent**.
5. Clique em **Save Changes**.

> O owner do servidor **não** depende desse intent — ele sempre tem permissão independentemente da configuração.

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

### `/recrutar`

Permite que qualquer membro do servidor Discord candidate-se ao clan Packet Loss sem precisar acessar o site.

**Quem pode usar:** qualquer usuário.

**Fluxo:**
1. Se já houver candidatura, o bot exibe o status atual (pendente, aprovado, rejeitado ou cancelado)
2. Caso contrário, abre um modal com a ficha de candidatura:
   - Nick no Among Us
   - Idade
   - Disponibilidade semanal
   - Experiência com Among Us
   - Por que quer entrar no clan
3. Os dados são enviados para `POST /api/bot/recrutamento` no site
4. O bot responde com embed de confirmação

Após a candidatura, o staff pode avaliar no painel admin em `/admin/recrutamento`. O candidato pode acompanhar o status executando `/recrutar` novamente.

---

### `/nova-partida` *(requer permissão)*

Registra uma nova partida de Among Us. Abre um fluxo interativo via botões e modais.

**Quem pode usar:** owner do servidor ou membros com o cargo definido em `ALLOWED_ROLE_ID` / `ALLOWED_USER_IDS`.

**Fluxo:**
1. O bot exibe a tabela de pontuação e um botão **▶ Iniciar registro**.
2. Um modal solicita o mapa e a data/hora da partida (`DD/MM/AAAA HH:MM`).
   - **Valores padrão:** mapa `The Skeld` e data de hoje às `22:00` (fuso horário de São Paulo).
3. O botão **➕ Adicionar Jogador** abre um modal por jogador. O conteúdo do modal varia conforme a data preenchida:
   - **Partida futura** (data/hora ainda não chegou): exibe apenas Discord ID e nome — os campos de papel, kills e flags são suprimidos. O jogador é registrado como **pré-inscrito** na sessão.
   - **Partida passada** (data/hora já passou): exibe todos os campos — papel (`impostor` / `tripulante`), kills/votos e flags (`won`, `died`, `sabotage`, `lostsabotage`, `ejected`, `kited`, `punished`).
4. O botão **✅ Finalizar** envia os dados à API e exibe:
   - Partida futura: lista de pré-inscritos sem scores.
   - Partida passada: ranking com scores calculados (🥇🥈🥉).

---

O bot consome as seguintes rotas HTTP da aplicação Next.js:

| Método   | Rota                              | Query params                  | Corpo (JSON)               | Descrição                                                        |
|----------|-----------------------------------|-------------------------------|----------------------------|------------------------------------------------------------------|
| GET      | `/api/bot/partidas`               | —                             | —                          | Lista todas as datas de campeonato registradas                   |
| GET      | `/api/bot/partida`                | —                             | —                          | Retorna a próxima sessão agendada                                |
| **POST** | **`/api/bot/partida`**            | —                             | `SubmitMatch` (ver abaixo) | **Cria uma nova partida** com jogadores e calcula pontuações     |
| GET      | `/api/bot/rank`                   | `player` *(nick)*             | —                          | Rank individual de um jogador pelo nick                          |
| GET      | `/api/bot/rankings`               | `tipo` (`ultima` \| `geral`)  | —                          | Ranking da última partida (`ultima`) ou acumulado (`geral`)      |
| GET      | `/api/bot/recrutamento`           | `discordId` *(string)*        | —                          | Status da candidatura de um usuário                              |
| **POST** | **`/api/bot/recrutamento`**       | —                             | `SubmitRecruitment`        | **Envia candidatura** ao clan Packet Loss                        |

> Para usar as rotas `POST` em produção, defina `API_BASE_URL` e `API_TOKEN` no `.env`. Em desenvolvimento, use `USE_MOCK_API=true` para simular as rotas de partida/ranking (recrutamento sempre usa a API real).

### `POST /api/bot/recrutamento` — Corpo da requisição (`SubmitRecruitment`)

```ts
{
  discordId: string      // Discord ID do candidato
  nick: string           // Nick no Among Us
  age: string            // Idade
  availability: string   // Disponibilidade semanal
  experience: string     // Experiência com Among Us
  motivation: string     // Motivação para entrar no clan
  referral?: string      // Como ficou sabendo (opcional)
}
```

**Resposta:**
```ts
{
  id: string
  status: 'pending'
  nick: string
  message: string
}
```

### `GET /api/bot/partidas` → `Match[]`

Retorna array com todas as partidas registradas (sem paginação).

### `GET /api/bot/partida` → `Match`

| Query param | Tipo   | Obrigatório | Descrição                                         |
|-------------|--------|-------------|---------------------------------------------------|
| `id`        | string | não         | ID da partida. Se omitido, retorna a última.      |

### `GET /api/bot/rank` → `PlayerRank`

| Query param | Tipo   | Obrigatório | Descrição                                         |
|-------------|--------|-------------|---------------------------------------------------|
| `player`    | string | sim         | Discord ID do jogador (ex: `123456789012345678`). |

### `GET /api/bot/rankings` → `LastMatchRanking` | `OverallRanking`

| Query param | Tipo   | Obrigatório | Valores             | Descrição                                         |
|-------------|--------|-------------|---------------------|---------------------------------------------------|
| `tipo`      | string | não         | `ultima` · `geral`  | Tipo do ranking. Padrão: `ultima`.                |

### `POST /api/bot/partida` — Corpo da requisição (`SubmitMatch`)

```ts
{
  map: string          // Nome do mapa (ex: "Polus")
  playedAt: string     // ISO 8601 (ex: "2026-04-27T20:30:00.000Z")
  players: Array<{
    discordId: string          // Discord ID do jogador
    name: string               // Nome de exibição
    role: 'impostor' | 'tripulante'
    kills: number              // Nº de kills (somente impostores)
    died: boolean              // O jogador morreu na partida
    won: boolean               // O time do jogador venceu
    wonBySabotage: boolean     // Impostor venceu por sabotagem (+2 bônus)
    lostBySabotage: boolean    // Tripulante perdeu por sabotagem (-5)
    ejectedCrewmate: boolean   // Botão de impostor ejetou tripulante (+1)
    kited: boolean             // Kitar ou cair (-5)
    punished: boolean          // Punição administrativa (-10)
    correctVotes: number       // Votos corretos em reuniões (+3 cada)
    wrongVotes: number         // Votos errados em reuniões (-4 cada)
  }>
}
```

**Resposta (`SubmitMatchResponse`):**
```ts
{
  id: string
  map: string
  playedAt: string
  players: Array<{ /* todos os campos acima */ score: number }>
}
```

**Cabeçalho de autenticação** (quando `API_TOKEN` estiver definido):
```
Authorization: Bearer <API_TOKEN>
```

### Tabela de pontuação (Among Us)

| Evento                                  | Pontos  |
|-----------------------------------------|---------|
| Vitória Impostor                        | +12 pts |
| Kill (Impostor)                         | +3 pts  |
| Vitória Tripulante Morto                | +5 pts  |
| Vitória Tripulante Vivo                 | +8 pts  |
| Vitória por Sabotagem (bônus Impostor)  | +2 pts  |
| Botão de Impostor ejetou Tripulante     | +1 pts  |
| Morreu (Tripulante)                     | +1 pts  |
| Voto Correto                            | +3 pts  |
| Derrota por Sabotagem (Tripulante)      | −5 pts  |
| Kitar ou Cair                           | −5 pts  |
| Voto Errado                             | −4 pts  |
| Punição administrativa                  | −10 pts |

### Formato das respostas de leitura

#### `GET /api/bot/partida` → `Match`

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

#### `GET /api/bot/rank` → `PlayerRank`

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

#### `GET /api/bot/rankings?tipo=ultima` → `LastMatchRanking`

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

#### `GET /api/bot/rankings?tipo=geral` → `OverallRanking`

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
2. Importe e adicione no array de comandos em `src/bot.ts`
3. Na próxima inicialização, o comando é registrado automaticamente

---

## Deploy em produção (Ansible)

O diretório `ansible/` contém um playbook que provisiona o bot em qualquer servidor Linux (testado no **Oracle Linux 9 ARM64**).

### O que o playbook faz

1. Cria o usuário/grupo de sistema `packetrank`
2. Adiciona o usuário de deploy (`nginx`) ao grupo `packetrank`
3. Cria `/opt/packetrank/packetrank` com `owner=nginx group=packetrank mode=2775`
   - `nginx` é dono: `tar`/`scp` podem alterar metadados do diretório (`utime`/`chmod`) sem erro
   - `packetrank` (serviço) acessa os arquivos via grupo
   - setgid (`2xxx`): novos arquivos herdam o grupo automaticamente
4. Cria regra de sudoers para que `nginx` possa gerenciar o serviço via `systemctl` sem senha
5. Ajusta o contexto SELinux de `httpd_sys_content_t` para **`var_t`**, que é acessível pelo domínio `unconfined_service_t` (padrão de serviços customizados no RHEL/OL 9) — o domínio já possui `execmem` implicitamente, sem necessidade de boolean adicional
6. Instala/atualiza a unit systemd e reinicia o serviço (se o build já existir)

### Pré-requisitos

```bash
pip install ansible
ansible-galaxy collection install ansible.posix community.general
```

### Uso

```bash
# 1. Copie e ajuste o inventory com o IP/host da VPS
cp ansible/inventory.ini.example ansible/inventory.ini

# 2. Execute o playbook (requer acesso root via SSH ou sudo)
ansible-playbook -i ansible/inventory.ini ansible/playbook.yml
```

### Estrutura

```
ansible/
├── inventory.ini.example   # Modelo de inventory — copie para inventory.ini
└── playbook.yml            # Playbook principal
```

### Notas sobre SELinux

O script de deploy original usava `httpd_sys_content_t` para o diretório `/opt/packetrank/packetrank`. Esse contexto é destinado a conteúdo servido pelo Apache/nginx e **não** concede permissão de execução a serviços customizados — o Node.js ficava bloqueado silenciosamente.

A correção é usar `var_t`:

| Contexto              | Acessível por               | Adequado para              |
|-----------------------|-----------------------------|----------------------------|
| `httpd_sys_content_t` | `httpd_t` (Apache)          | Arquivos estáticos web     |
| `var_t`               | `unconfined_service_t`      | Serviços systemd customizados |

---

## Links

- Site: [packetloss.com.br](https://packetloss.com.br)
- Repositório do site: [github.com/sistematico/packetloss](https://github.com/sistematico/packetloss)
