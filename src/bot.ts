import 'dotenv/config'
import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from 'discord.js'

import * as partida from './commands/partida.js'
import * as rank from './commands/rank.js'
import * as ranking from './commands/ranking.js'
import * as novaPartida from './commands/nova-partida.js'
import * as recrutar from './commands/recrutar.js'

// ---------------------------------------------------------------------------
// Validação de variáveis de ambiente
// ---------------------------------------------------------------------------

const { DISCORD_TOKEN, DISCORD_APP_ID, DISCORD_GUILD_ID } = process.env

if (!DISCORD_TOKEN) throw new Error('DISCORD_TOKEN não definido no .env')
if (!DISCORD_APP_ID) throw new Error('DISCORD_APP_ID não definido no .env')

// ---------------------------------------------------------------------------
// Registro de comandos
// ---------------------------------------------------------------------------

type Command = {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

const commands = new Collection<string, Command>()

for (const cmd of [partida, rank, ranking, novaPartida, recrutar] as Command[]) {
  commands.set(cmd.data.name, cmd)
}

async function registerCommands(): Promise<void> {
  const rest = new REST().setToken(DISCORD_TOKEN!)
  const body = commands.map(c => c.data.toJSON())
  console.log(`[register] Comandos carregados: ${commands.map(c => c.data.name).join(', ')}`)

  if (DISCORD_GUILD_ID) {
    // Registro instantâneo para o servidor de desenvolvimento
    await rest.put(Routes.applicationGuildCommands(DISCORD_APP_ID!, DISCORD_GUILD_ID), { body })
    console.log(`[register] ${body.length} comandos registrados no guild ${DISCORD_GUILD_ID}`)
  } else {
    // Registro global (pode levar até 1 h para propagar)
    await rest.put(Routes.applicationCommands(DISCORD_APP_ID!), { body })
    console.log(`[register] ${body.length} comandos registrados globalmente`)
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })

client.once(Events.ClientReady, async c => {
  console.log(`[bot] Online como ${c.user.tag}`)
  try {
    await registerCommands()
  } catch (err) {
    console.error('[register] Falha ao registrar comandos:', err)
  }
})

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return

  const cmd = commands.get(interaction.commandName)
  if (!cmd) return

  try {
    await cmd.execute(interaction)
  } catch (err) {
    console.error(`[interaction] Erro em /${interaction.commandName}:`, err)
    const content = '⚠️ Ocorreu um erro ao executar este comando.'
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral })
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral })
    }
  }
})

client.login(DISCORD_TOKEN)
