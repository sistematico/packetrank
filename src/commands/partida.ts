import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { getMatch, getLastMatch } from '../api/client.js'
import type { Match } from '../api/types.js'

export const data = new SlashCommandBuilder()
  .setName('partida')
  .setDescription('Exibe informações de uma partida')
  .addStringOption(opt =>
    opt
      .setName('id')
      .setDescription('ID da partida (omita para ver a última)')
      .setRequired(false)
  )

function buildMatchEmbed(match: Match): EmbedBuilder {
  const resultado =
    match.winner === 'draw'
      ? 'Empate'
      : match.winner === 'team1'
        ? `Time 1 venceu (${match.team1Score}–${match.team2Score})`
        : `Time 2 venceu (${match.team2Score}–${match.team1Score})`

  const inicio = new Date(match.startedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const fim = new Date(match.endedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const rows = [...(match.players ?? [])]
    .sort((a, b) => b.score - a.score)
    .map((mp, i) => {
      const kd = (mp.kills / Math.max(mp.deaths, 1)).toFixed(2)
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
      return `${medal} **${mp.player.name}** — Score: \`${mp.score}\` | K/D: \`${kd}\` | ${mp.kills}/${mp.deaths}/${mp.assists}`
    })
    .join('\n')

  return new EmbedBuilder()
    .setColor(match.winner === 'draw' ? Colors.Yellow : Colors.Green)
    .setTitle(`🎮 Partida #${match.id} — ${match.map}`)
    .setDescription(`**Modo:** ${match.mode}\n**Resultado:** ${resultado}`)
    .addFields(
      { name: '🕐 Início', value: inicio, inline: true },
      { name: '🏁 Fim', value: fim, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '📊 Jogadores', value: rows || 'Sem dados', inline: false }
    )
    .setFooter({ text: 'packetloss.com.br' })
    .setTimestamp()
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply()

  const id = interaction.options.getString('id')

  try {
    const match = id ? await getMatch(id) : await getLastMatch()

    if (!match) {
      await interaction.editReply({
        content: id
          ? `❌ Partida \`${id}\` não encontrada.`
          : '❌ Nenhuma partida registrada ainda.',
      })
      return
    }

    await interaction.editReply({ embeds: [buildMatchEmbed(match)] })
  } catch (err) {
    console.error('[/partida]', err)
    await interaction.editReply({ content: '⚠️ Erro ao buscar partida. Tente novamente mais tarde.' })
  }
}
