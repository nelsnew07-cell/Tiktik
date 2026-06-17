import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

/* ================= RAILWAY VARIABLES ================= */
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const staffRoleId = process.env.STAFFROLE_ID;

/* ================= DEBUG CHECK ================= */
console.log("TOKEN:", token ? "OK" : "MISSING");
console.log("CLIENT_ID:", clientId ? "OK" : "MISSING");
console.log("GUILD_ID:", guildId ? "OK" : "MISSING");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= SLASH COMMAND ================= */
const commands = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open ticket panel")
    .toJSON()
];

/* ================= REGISTER COMMANDS ================= */
const rest = new REST({ version: "10" });

async function registerCommands() {
  try {
    console.log("Registering slash commands...");

    rest.setToken(token);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("Slash commands registered successfully!");
  } catch (err) {
    console.error("REGISTER ERROR:", err);
  }
}

/* ================= READY ================= */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await registerCommands();
});

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {

  // /ticket
  if (interaction.isChatInputCommand() && interaction.commandName === "ticket") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket System")
      .setDescription("Click the button below to create a ticket.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }

  // CREATE TICKET
  if (interaction.isButton() && interaction.customId === "create_ticket") {

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: staffRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Opened")
      .setDescription("A staff member will assist you soon.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `Ticket created: ${channel}`,
      ephemeral: true
    });
  }

  // CLOSE TICKET
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    await interaction.reply("Closing ticket...");

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 3000);
  }
});

/* ================= LOGIN ================= */
client.login(token);
