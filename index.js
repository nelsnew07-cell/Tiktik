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

/* ================= ENV CHECK ================= */
const token = process.env.token;
const clientId = process.env.clientId;
const guildId = process.env.guildId;
const staffRoleId = process.env.staffRoleId;

/* 🔥 DEBUG: show if variables are missing */
console.log("TOKEN:", token ? "OK" : "MISSING");
console.log("CLIENT ID:", clientId ? "OK" : "MISSING");
console.log("GUILD ID:", guildId ? "OK" : "MISSING");

/* ================= CLIENT ================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */
const commands = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open ticket panel")
    .toJSON()
];

/* ================= REGISTER COMMANDS ================= */
const rest = new REST({ version: "10" }).setToken(token);

async function registerCommands() {
  try {
    console.log("REGISTER STARTING...");

    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("REGISTER SUCCESS:", data);
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

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "ticket") {

      const embed = new EmbedBuilder()
        .setTitle("Ticket System")
        .setDescription("Click button below")
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Create Ticket")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

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
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: staffRoleId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    await channel.send(`Ticket opened for <@${interaction.user.id}>`);

    return interaction.reply({
      content: `Created: ${channel}`,
      ephemeral: true
    });
  }
});

client.login(token);
