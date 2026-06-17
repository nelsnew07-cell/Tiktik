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

/* ================= TICKET CATEGORY ================= */
const ticketCategoryId = "1470085301941702838";

/* ================= STAFF ROLE IDS (NO BAD ROLE) ================= */
const staffRoles = [
  "1474440409848479745",
  "1465642372405919785",
  "1465368284944928869",
  "1462423468753817723"
];

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

/* ================= CREATE TICKET ================= */
async function createTicket(interaction, type, emoji) {

  const channel = await interaction.guild.channels.create({
    name: `${type}-${interaction.user.username}`,
    parent: ticketCategoryId,
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
    .setTitle(`${emoji} ${type.toUpperCase()} TICKET`)
    .setDescription("Please wait for staff assistance.")
    .setColor("Green");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );

  /* ================= NO ROLE 690727923388383294 ANYMORE ================= */
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

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {

  /* ---------- SLASH COMMAND ---------- */
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "ticket") {

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket System")
        .setDescription("Select a category below:")
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("support")
          .setLabel("Support")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("report")
          .setLabel("Report")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("buy")
          .setLabel("Buy")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  /* ---------- BUTTONS ---------- */
  if (interaction.isButton()) {

    if (interaction.customId === "support") {
      return createTicket(interaction, "support", "🛠");
    }

    if (interaction.customId === "report") {
      return createTicket(interaction, "report", "🚨");
    }

    if (interaction.customId === "buy") {
      return createTicket(interaction, "buy", "💰");
    }

    if (interaction.customId === "close_ticket") {

      await interaction.reply("Closing ticket...");

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

/* ================= LOGIN ================= */
client.login(token);
