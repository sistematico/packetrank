import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js'
import { getPlayerRank } from '../api/client.js'
import type { PlayerRank } from '../api/types.js'

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('Exibe o rank individual de um jogador')
  .addUserOption(opt =>
    opt
      .setName('usuario')
      .setDescription('Mencione o jogador (padrão: você mesmo)')
      .setRequired(false)
  )

function medal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

function buildRankEmbed(rank: PlayerRank): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`${medal(rank.rank)} ${rank.player.name}`)
    .setDescription(`**Posição geral:** ${medal(rank.rank)}`)
    .addFields(
      { name: '🏆 Score acumulado', value: String(rank.score), inline: true },
      { name: '🎯 Último score', value: String(rank.lastMatchScore), inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '✅ Vitórias', value: String(rank.wins), inline: true },
      { name: '❌ Derrotas', value: String(rank.losses), inline: true },
      { name: '📈 Win Rate', value: `${rank.winRate.toFixed(1)}%`, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '🔫 Kills', value: String(rank.kills), inline: true },
      { name: '💀 Deaths', value: String(rank.deaths), inline: true },
      { name: '🤝 Assists', value: String(rank.assists), inline: true },
      { name: '📊 K/D', value: String(rank.kd), inline: true },
    )
    .setFooter({ text: 'packetloss.com.br' })
    .setTimestamp()
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply()

  const target = interaction.options.getUser('usuario') ?? interaction.user

  try {
    const rank = await getPlayerRank(target.id)

    if (!rank) {
      const quem = target.id === interaction.user.id ? 'Você ainda não' : `\`${target.username}\` ainda não`
      await interaction.editReply({ content: `❌ ${quem} possui estatísticas registradas.` })
      return
    }

    await interaction.editReply({ embeds: [buildRankEmbed(rank)] })
  } catch (err) {
    console.error('[/rank]', err)
    await interaction.editReply({ content: '⚠️ Erro ao buscar rank. Tente novamente mais tarde.' })
  }
}
