import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import config from "./config.json" assert { type: "json" };

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

/* ---------------- REGISTER COMMAND ---------------- */
const commands = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Send ticket panel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(config.token);

await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commands }
);

/* ---------------- INTERACTIONS ---------------- */
client.on("interactionCreate", async (interaction) => {

  // 🎫 Ticket Panel
  if (interaction.isChatInputCommand() && interaction.commandName === "ticket") {

    const embed = new EmbedBuilder()
      .setTitle("🎫 Support Tickets")
      .setDescription("Click below to create a ticket")
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

  // 🟢 Create Ticket
  if (interaction.isButton() && interaction.customId === "create_ticket") {

    const guild = interaction.guild;

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        {
          id: config.staffRoleId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle("Ticket Opened")
      .setDescription("A staff member will assist you soon.")
      .setColor("Green");

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

  // 🔴 Close Ticket
  if (interaction.isButton() && interaction.customId === "close_ticket") {

    await interaction.reply("Closing ticket...");

    setTimeout(() => {
      interaction.channel.delete();
    }, 3000);
  }

});

client.login(config.token);
