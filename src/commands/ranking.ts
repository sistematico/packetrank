import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { getLastMatchRanking, getOverallRanking } from '../api/client.js'
import type { LastMatchRanking, OverallRanking } from '../api/types.js'

export const data = new SlashCommandBuilder()
  .setName('ranking')
  .setDescription('Exibe o ranking de jogadores')
  .addStringOption(opt =>
    opt
      .setName('tipo')
      .setDescription('Tipo de ranking (padrão: última partida)')
      .setRequired(false)
      .addChoices(
        { name: 'Última Partida', value: 'ultima' },
        { name: 'Acumulado (geral)', value: 'geral' }
      )
  )

function medal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `**${rank}.**`
}

function buildLastMatchEmbed(data: LastMatchRanking): EmbedBuilder {
  const playedAt = new Date(data.playedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const rows = (data.entries ?? [])
    .map(e => `${medal(e.rank)} **${e.player.name}** — Score: \`${e.score}\` | K/D: \`${e.kd}\` | ${e.kills}/${e.deaths}/${e.assists}`)
    .join('\n')

  return new EmbedBuilder()
    .setColor(Colors.Gold)
    .setTitle(`🏆 Ranking — Última Partida (${data.map})`)
    .setDescription(rows || 'Sem dados')
    .addFields({ name: '🕐 Data', value: playedAt, inline: true })
    .setFooter({ text: `Partida #${data.matchId} • packetloss.com.br` })
    .setTimestamp()
}

function buildOverallEmbed(data: OverallRanking): EmbedBuilder {
  const updatedAt = new Date(data.updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const rows = (data.entries ?? [])
    .map(e =>
      `${medal(e.rank)} **${e.player.name}** — Score: \`${e.score}\` | K/D: \`${e.kd}\` | WR: \`${e.winRate.toFixed(1)}%\` | ${e.kills}K/${e.deaths}D/${e.assists}A`
    )
    .join('\n')

  return new EmbedBuilder()
    .setColor(Colors.DarkGold)
    .setTitle('🏅 Ranking Geral Acumulado')
    .setDescription(rows || 'Sem dados')
    .addFields(
      { name: '🎮 Partidas registradas', value: String(data.totalMatches), inline: true },
      { name: '🔄 Atualizado em', value: updatedAt, inline: true }
    )
    .setFooter({ text: 'packetloss.com.br' })
    .setTimestamp()
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply()

  const tipo = interaction.options.getString('tipo') ?? 'ultima'

  try {
    if (tipo === 'ultima') {
      const data = await getLastMatchRanking()
      if (!data) {
        await interaction.editReply({ content: '❌ Nenhuma partida registrada ainda.' })
        return
      }
      await interaction.editReply({ embeds: [buildLastMatchEmbed(data)] })
    } else {
      const data = await getOverallRanking()
      if (!data) {
        await interaction.editReply({ content: '❌ Nenhum dado de ranking disponível.' })
        return
      }
      await interaction.editReply({ embeds: [buildOverallEmbed(data)] })
    }
  } catch (err) {
    console.error('[/ranking]', err)
    await interaction.editReply({ content: '⚠️ Erro ao buscar ranking. Tente novamente mais tarde.' })
  }
}
