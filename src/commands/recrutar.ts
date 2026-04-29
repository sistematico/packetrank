/**
 * /recrutar — Envia uma candidatura para entrar no clan Packet Loss.
 *
 * Fluxo:
 * 1. Usuário executa /recrutar
 * 2. Bot abre um modal com os campos da ficha de recrutamento
 * 3. Após submit, bot envia os dados para a API do site
 * 4. Bot responde com confirmação ou erro
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Colors,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js'
import { submitRecruitment, checkRecruitmentStatus } from '../api/client.js'

export const data = new SlashCommandBuilder()
  .setName('recrutar')
  .setDescription('Candidate-se para entrar no clan Packet Loss')

export async function execute(interaction: ChatInputCommandInteraction) {
  // O modal deve ser a primeira resposta à interaction (Discord exige resposta em < 3s).
  // A verificação de candidatura existente é feita após o submit do modal.

  // Abre o modal de candidatura
  const modal = new ModalBuilder()
    .setCustomId('recrutar_modal')
    .setTitle('Candidatura — Packet Loss Clan')

  const nickInput = new TextInputBuilder()
    .setCustomId('nick')
    .setLabel('Nick no Among Us')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Seu nick exato no jogo')
    .setRequired(true)
    .setMaxLength(64)

  const ageInput = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('Idade')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 20')
    .setRequired(true)
    .setMaxLength(16)

  const availabilityInput = new TextInputBuilder()
    .setCustomId('availability')
    .setLabel('Disponibilidade semanal')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: noites de terça e quinta, fim de semana')
    .setRequired(true)
    .setMaxLength(128)

  const experienceInput = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('Experiência com Among Us')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Há quanto tempo joga? Já jogou em outros clans?')
    .setRequired(true)
    .setMaxLength(500)

  const motivationInput = new TextInputBuilder()
    .setCustomId('motivation')
    .setLabel('Por que quer entrar no clan?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Conte um pouco sobre você e sua motivação...')
    .setRequired(true)
    .setMaxLength(800)

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nickInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(ageInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(availabilityInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(motivationInput),
  )

  await interaction.showModal(modal)

  // Aguarda o submit do modal
  let modalInteraction: ModalSubmitInteraction
  try {
    modalInteraction = await interaction.awaitModalSubmit({
      filter: (i) => i.customId === 'recrutar_modal' && i.user.id === interaction.user.id,
      time: 10 * 60 * 1000,
    })
  } catch {
    return
  }

  await modalInteraction.deferReply({ flags: MessageFlags.Ephemeral })

  const discordId = interaction.user.id

  // Verifica candidatura existente agora que já temos tempo para chamar a API
  try {
    const statusResult = await checkRecruitmentStatus(discordId)
    if (statusResult?.application) {
      const app = statusResult.application

      const statusLabels: Record<string, string> = {
        pending: '⏳ Aguardando avaliação',
        approved: '✅ Aprovado',
        rejected: '❌ Não aprovado',
        withdrawn: '🚫 Cancelada',
      }

      const statusColors: Record<string, number> = {
        pending: Colors.Yellow,
        approved: Colors.Green,
        rejected: Colors.Red,
        withdrawn: Colors.Grey,
      }

      const embed = new EmbedBuilder()
        .setTitle('Sua candidatura')
        .setColor(statusColors[app.status] ?? Colors.Grey)
        .addFields(
          { name: 'Nick', value: app.nick, inline: true },
          { name: 'Status', value: statusLabels[app.status] ?? app.status, inline: true },
        )

      if (app.createdAt) {
        embed.addFields({
          name: 'Enviada em',
          value: new Date(app.createdAt).toLocaleDateString('pt-BR'),
          inline: true,
        })
      }

      if (app.notes) {
        embed.addFields({ name: 'Feedback do staff', value: app.notes })
      }

      if (app.status === 'pending') {
        embed.setFooter({ text: 'Aguarde — o staff vai entrar em contato.' })
      } else if (app.status === 'approved') {
        embed.setFooter({ text: 'Bem-vindo ao clan Packet Loss! 🎉' })
      } else if (app.status === 'rejected') {
        embed.setFooter({ text: 'Você pode enviar uma nova candidatura usando /recrutar novamente.' })
      }

      await modalInteraction.editReply({ embeds: [embed] })
      return
    }
  } catch {
    // Se a API falhar na checagem, continua e tenta submeter a candidatura
  }

  const nick = modalInteraction.fields.getTextInputValue('nick').trim()
  const age = modalInteraction.fields.getTextInputValue('age').trim()
  const availability = modalInteraction.fields.getTextInputValue('availability').trim()
  const experience = modalInteraction.fields.getTextInputValue('experience').trim()
  const motivation = modalInteraction.fields.getTextInputValue('motivation').trim()

  try {
    await submitRecruitment({
      discordId: interaction.user.id,
      nick,
      age,
      availability,
      experience,
      motivation,
    })

    const successEmbed = new EmbedBuilder()
      .setTitle('Candidatura enviada!')
      .setColor(Colors.Green)
      .setDescription(
        'Sua ficha foi recebida com sucesso. O staff do **Packet Loss** vai avaliar e entrar em contato pelo Discord.',
      )
      .addFields(
        { name: 'Nick', value: nick, inline: true },
        { name: 'Status', value: '⏳ Aguardando avaliação', inline: true },
      )
      .setFooter({ text: 'Use /recrutar para acompanhar o status da sua candidatura.' })

    await modalInteraction.editReply({ embeds: [successEmbed] })
  } catch (err) {
    const errorMessage =
      err instanceof Error && err.message.includes('422')
        ? await extractApiError(err.message)
        : 'Não foi possível enviar sua candidatura. Tente novamente mais tarde.'

    const errorEmbed = new EmbedBuilder()
      .setTitle('Erro ao enviar candidatura')
      .setColor(Colors.Red)
      .setDescription(errorMessage)

    await modalInteraction.editReply({ embeds: [errorEmbed] })
  }
}

async function extractApiError(message: string): Promise<string> {
  return message || 'Erro ao processar a candidatura.'
}
