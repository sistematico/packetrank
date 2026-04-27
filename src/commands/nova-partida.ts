/**
 * /nova-partida — Registra uma nova partida de Among Us.
 *
 * Fluxo:
 * 1. /nova-partida abre um embed com botões explicativos.
 * 2. Botão "Iniciar registro" abre um Modal para dados gerais (mapa, data/hora).
 * 3. Após o modal, o bot pede os jogadores um a um via novo modal por jogador.
 * 4. Botão "Finalizar" envia os dados para a API.
 *
 * Permissão: owner do servidor OU cargo definido em ALLOWED_ROLE_ID (múltiplos IDs separados por vírgula).
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Colors,
  MessageFlags,
  ButtonInteraction,
  ModalSubmitInteraction,
  ComponentType,
  type Guild,
} from 'discord.js'
import { submitMatch } from '../api/client.js'
import type { SubmitMatch, SubmitMatchPlayer, PlayerRole } from '../api/types.js'

export const data = new SlashCommandBuilder()
  .setName('nova-partida')
  .setDescription('Registra uma nova partida de Among Us (requer permissão)')

// ---------------------------------------------------------------------------
// Tabela de pontuação
// ---------------------------------------------------------------------------
const POINTS_TABLE = `
\`\`\`
Vitória Impostor              +12 pts
Kill (Impostor)               +3 pts
Vitória Tripulante Morto      +5 pts
Vitória por Sabotagem (bônus) +2 pts
Derrota por Sabotagem         -5 pts
Botão ejetou Tripulante       +1 pts
Kitar / Cair                  -5 pts
Voto Correto                  +3 pts
Voto Errado                   -4 pts
Vitória Tripulante Vivo       +8 pts
Morreu                        +1 pts
Punição                       -10 pts
\`\`\`
`.trim()

// ---------------------------------------------------------------------------
// Guard de permissão
// ---------------------------------------------------------------------------
async function hasPermission(interaction: ChatInputCommandInteraction | ButtonInteraction): Promise<boolean> {
  const userId = interaction.user.id

  // Usuários explicitamente permitidos por ID (mais confiável que owner check)
  const allowedUserIds = (process.env.ALLOWED_USER_IDS ?? '').split(',').map(id => id.trim()).filter(Boolean)
  if (allowedUserIds.includes(userId)) return true

  // Owner do servidor
  const guild = interaction.guild as Guild | null
  if (guild) {
    const ownerId = guild.ownerId || (await guild.fetch().catch(() => null))?.ownerId
    if (ownerId && userId === ownerId) return true
  }

  // Cargos permitidos
  const allowedRoleIds = (process.env.ALLOWED_ROLE_ID ?? '').split(',').map(id => id.trim()).filter(Boolean)
  if (allowedRoleIds.length > 0 && guild) {
    const member = await guild.members.fetch(userId).catch(() => null)
    if (member && allowedRoleIds.some(id => member.roles.cache.has(id))) return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Estado em memória por usuário (TTL implícito: coletor de 30min)
// ---------------------------------------------------------------------------
interface MatchSession {
  map: string
  playedAt: string
  players: SubmitMatchPlayer[]
}

const sessions = new Map<string, MatchSession>()

// ---------------------------------------------------------------------------
// Helpers de modal
// ---------------------------------------------------------------------------
function todayBR(): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now)
  const d = parts.find(p => p.type === 'day')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const y = parts.find(p => p.type === 'year')!.value
  return `${d}/${m}/${y} 22:00`
}

function isFutureMatch(playedAt: string): boolean {
  return new Date(playedAt) > new Date()
}

function buildMatchInfoModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId('modal_match_info')
    .setTitle('Dados da Partida')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('map')
          .setLabel('Mapa')
          .setStyle(TextInputStyle.Short)
          .setValue('The Skeld')
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('playedAt')
          .setLabel('Data e hora (DD/MM/AAAA HH:MM)')
          .setStyle(TextInputStyle.Short)
          .setValue(todayBR())
          .setRequired(true)
          .setMaxLength(16),
      ),
    )
}

function buildPlayerModal(index: number, future: boolean): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`modal_player_${index}`)
    .setTitle(future ? `Jogador ${index + 1} — pré-registro` : `Jogador ${index + 1}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('discordId')
          .setLabel('Discord ID ou @menção')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 123456789012345678')
          .setRequired(true)
          .setMaxLength(30),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('name')
          .setLabel('Nome do jogador')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(40),
      ),
    )

  if (!future) {
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('role')
          .setLabel('Papel (impostor / tripulante)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('impostor  ou  tripulante')
          .setRequired(true)
          .setMaxLength(15),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('kills_votes')
          .setLabel('Kills / Votos corretos / Votos errados')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ex: 2 3 1  (kills corretos errados)')
          .setRequired(false)
          .setMaxLength(20),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('flags')
          .setLabel('Flags (separadas por vírgula)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('won, died, sabotage, lostsabotage, ejected, kited, punished')
          .setRequired(false)
          .setMaxLength(200),
      ),
    )
  }

  return modal
}

// ---------------------------------------------------------------------------
// Cálculo de pontuação local (para preview)
// ---------------------------------------------------------------------------
function calcScore(p: SubmitMatchPlayer): number {
  let score = 0
  if (p.role === 'impostor' && p.won) score += 12
  if (p.role === 'tripulante' && p.won && p.died) score += 5
  if (p.role === 'tripulante' && p.won && !p.died) score += 8
  score += p.kills * 3
  if (p.wonBySabotage) score += 2
  if (p.lostBySabotage) score -= 5
  if (p.ejectedCrewmate) score += 1
  if (p.kited) score -= 5
  if (p.died && p.role === 'tripulante') score += 1
  score += p.correctVotes * 3
  score -= p.wrongVotes * 4
  if (p.punished) score -= 10
  return score
}

// ---------------------------------------------------------------------------
// Parsear flags do campo livre
// ---------------------------------------------------------------------------
function parsePlayer(fields: Record<string, string>, future: boolean): SubmitMatchPlayer {
  const base = {
    discordId: fields.discordId.replace(/[<@!>]/g, '').trim(),
    name: fields.name.trim(),
  }

  if (future) {
    return {
      ...base,
      role: 'tripulante' as PlayerRole,
      kills: 0,
      died: false,
      won: false,
      wonBySabotage: false,
      lostBySabotage: false,
      ejectedCrewmate: false,
      kited: false,
      punished: false,
      correctVotes: 0,
      wrongVotes: 0,
    }
  }

  const rawFlags = (fields.flags ?? '').toLowerCase()
  const flags = rawFlags.split(',').map(f => f.trim())
  const role = fields.role.trim().toLowerCase() === 'impostor' ? 'impostor' : 'tripulante' as PlayerRole

  // kills_votes field: "kills correctVotes wrongVotes" (space-separated)
  const kvParts = (fields.kills_votes ?? '').trim().split(/\s+/)
  const kills = parseInt(kvParts[0] ?? '0', 10) || 0
  const correctVotes = parseInt(kvParts[1] ?? '0', 10) || 0
  const wrongVotes = parseInt(kvParts[2] ?? '0', 10) || 0

  return {
    ...base,
    role,
    kills,
    died: flags.includes('died'),
    won: flags.includes('won'),
    wonBySabotage: flags.includes('sabotage'),
    lostBySabotage: flags.includes('lostsabotage'),
    ejectedCrewmate: flags.includes('ejected'),
    kited: flags.includes('kited'),
    punished: flags.includes('punished'),
    correctVotes,
    wrongVotes,
  }
}

// ---------------------------------------------------------------------------
// Parsear data BR → ISO 8601
// ---------------------------------------------------------------------------
function parseBrDate(raw: string): string {
  // Aceita "DD/MM/AAAA HH:MM" ou "DD/MM/AAAA"
  const match = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (!match) throw new Error(`Formato de data inválido: ${raw}`)
  const [, d, m, y, h = '00', min = '00'] = match
  return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min}:00`).toISOString()
}

// ---------------------------------------------------------------------------
// Embed de resumo
// ---------------------------------------------------------------------------
function buildSummaryEmbed(session: MatchSession): EmbedBuilder {
  const playedAt = new Date(session.playedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const future = isFutureMatch(session.playedAt)
  const rows = session.players.map((p, i) => {
    if (future) return `${i + 1}. **${p.name}** — pré-registrado`
    const score = calcScore(p)
    return `${i + 1}. **${p.name}** (${p.role}) — Score: \`${score}\``
  }).join('\n')

  return new EmbedBuilder()
    .setColor(future ? Colors.Yellow : Colors.Orange)
    .setTitle(`📋 ${future ? 'Pré-registro' : 'Resumo'} — ${session.map}`)
    .setDescription(rows || 'Nenhum jogador adicionado ainda.')
    .addFields({ name: '📅 Data', value: playedAt, inline: true })
    .setFooter({ text: future ? '⏳ Partida futura — scores serão preenchidos depois.' : 'Revise e clique em Finalizar para enviar.' })
}

// ---------------------------------------------------------------------------
// Execute do comando
// ---------------------------------------------------------------------------
export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await hasPermission(interaction))) {
    await interaction.reply({ content: '🚫 Você não tem permissão para registrar partidas.', flags: MessageFlags.Ephemeral })
    return
  }

  const sessionKey = interaction.user.id

  const infoRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_start_match')
      .setLabel('▶ Iniciar registro')
      .setStyle(ButtonStyle.Primary),
  )

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle('🎮 Nova Partida — Among Us')
    .setDescription('Clique em **Iniciar registro** para preencher os dados da partida.\n\nTabela de pontuação:\n' + POINTS_TABLE)
    .setFooter({ text: 'Somente usuários autorizados podem registrar partidas.' })

  const reply = await interaction.reply({ embeds: [embed], components: [infoRow], flags: MessageFlags.Ephemeral, fetchReply: true })

  // ---- Coletor de botões e modais ----------------------------------------
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 30 * 60 * 1000, // 30 minutos
    filter: i => i.user.id === interaction.user.id,
  })

  collector.on('collect', async (btn: ButtonInteraction) => {
    const session = sessions.get(sessionKey) ?? { map: '', playedAt: '', players: [] }

    // ---- Iniciar registro --------------------------------------------------
    if (btn.customId === 'btn_start_match') {
      await btn.showModal(buildMatchInfoModal())

      const modalSubmit = await btn.awaitModalSubmit({
        time: 10 * 60 * 1000,
        filter: m => m.customId === 'modal_match_info' && m.user.id === interaction.user.id,
      }).catch(() => null)

      if (!modalSubmit) return

      try {
        session.map = modalSubmit.fields.getTextInputValue('map').trim()
        session.playedAt = parseBrDate(modalSubmit.fields.getTextInputValue('playedAt'))
        session.players = []
        sessions.set(sessionKey, session)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        await modalSubmit.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral })
        return
      }

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('btn_add_player').setLabel('➕ Adicionar Jogador').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_finish_match').setLabel('✅ Finalizar').setStyle(ButtonStyle.Danger),
      )

      await modalSubmit.deferUpdate()
      await interaction.editReply({ embeds: [buildSummaryEmbed(session)], components: [actionRow] })
      return
    }

    // ---- Adicionar jogador -------------------------------------------------
    if (btn.customId === 'btn_add_player') {
      const currentSession = sessions.get(sessionKey)
      if (!currentSession) {
        await btn.reply({ content: '❌ Sessão expirada. Execute /nova-partida novamente.', flags: MessageFlags.Ephemeral })
        return
      }

      const future = isFutureMatch(currentSession.playedAt)
      const playerIndex = currentSession.players.length
      await btn.showModal(buildPlayerModal(playerIndex, future))

      const playerSubmit = await btn.awaitModalSubmit({
        time: 10 * 60 * 1000,
        filter: m => m.customId === `modal_player_${playerIndex}` && m.user.id === interaction.user.id,
      }).catch(() => null)

      if (!playerSubmit) return

      const fields: Record<string, string> = {
        discordId: playerSubmit.fields.getTextInputValue('discordId'),
        name: playerSubmit.fields.getTextInputValue('name'),
      }
      if (!future) {
        fields.role = playerSubmit.fields.getTextInputValue('role')
        fields.kills_votes = playerSubmit.fields.getTextInputValue('kills_votes')
        fields.flags = playerSubmit.fields.getTextInputValue('flags')
      }

      const player = parsePlayer(fields, future)

      currentSession.players.push(player)
      sessions.set(sessionKey, currentSession)

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('btn_add_player').setLabel('➕ Adicionar Jogador').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_finish_match').setLabel('✅ Finalizar').setStyle(ButtonStyle.Danger),
      )

      await playerSubmit.deferUpdate()
      await interaction.editReply({ embeds: [buildSummaryEmbed(currentSession)], components: [actionRow] })
      return
    }

    // ---- Finalizar ---------------------------------------------------------
    if (btn.customId === 'btn_finish_match') {
      const currentSession = sessions.get(sessionKey)
      if (!currentSession || currentSession.players.length === 0) {
        await btn.reply({ content: '❌ Adicione pelo menos um jogador antes de finalizar.', flags: MessageFlags.Ephemeral })
        return
      }

      await btn.deferUpdate()

      const payload: SubmitMatch = {
        map: currentSession.map,
        playedAt: currentSession.playedAt,
        players: currentSession.players,
      }

      try {
        const useMock = process.env.USE_MOCK_API === 'true' || !process.env.API_BASE_URL
        if (useMock) {
          // Simula resposta no modo mock
          const mockResult = {
            id: `mock-${Date.now()}`,
            ...payload,
            players: payload.players.map(p => ({ ...p, score: calcScore(p) })),
          }
          sessions.delete(sessionKey)
          const doneEmbed = buildDoneEmbed(mockResult)
          await btn.editReply({ embeds: [doneEmbed], components: [] })
          return
        }

        const result = await submitMatch(payload)
        sessions.delete(sessionKey)
        const doneEmbed = buildDoneEmbed(result)
        await btn.editReply({ embeds: [doneEmbed], components: [] })
      } catch (err) {
        console.error('[/nova-partida] Erro ao enviar:', err)
        await btn.editReply({ content: '⚠️ Erro ao enviar partida para a API. Tente novamente mais tarde.', embeds: [], components: [] })
      }
      collector.stop()
      return
    }
  })

  collector.on('end', () => {
    sessions.delete(sessionKey)
  })
}

// ---------------------------------------------------------------------------
// Embed de conclusão
// ---------------------------------------------------------------------------
function buildDoneEmbed(result: { id: string; map: string; playedAt: string; players: (SubmitMatchPlayer & { score: number })[] }): EmbedBuilder {
  const playedAt = new Date(result.playedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const future = isFutureMatch(result.playedAt)

  const rows = future
    ? result.players.map((p, i) => `${i + 1}. **${p.name}** — pré-registrado`).join('\n')
    : [...result.players]
        .sort((a, b) => b.score - a.score)
        .map((p, i) => {
          const medals = ['🥇', '🥈', '🥉']
          const pos = medals[i] ?? `${i + 1}.`
          return `${pos} **${p.name}** (${p.role}) — \`${p.score} pts\``
        })
        .join('\n')

  return new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle(future ? `📅 Pré-registro salvo! — ${result.map}` : `✅ Partida registrada! — ${result.map}`)
    .setDescription(rows)
    .addFields({ name: '📅 Data', value: playedAt, inline: true }, { name: '🆔 ID', value: result.id, inline: true })
    .setFooter({ text: 'packetloss.com.br' })
    .setTimestamp()
}
