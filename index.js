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

import fs from "fs";

import {
  updateLeaderboard,
  cleanupOldLeaderboards
} from "./leaderboard.js";

import {
  data as announceData,
  execute as announceExecute
} from "./commands/announce.js";

/* ================= ENV ================= */

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const staffRoleId = process.env.STAFFROLE_ID;

/* ================= CHANNEL IDS ================= */

const ticketCategoryId = "1470085301941702838";
const transcriptChannelId = "1490027750608867578";

/* ================= DATA ================= */

const DATA_FILE = "./leaderboard.json";

let staffStats = new Map();

if (fs.existsSync(DATA_FILE)) {
  const raw = JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );

  staffStats = new Map(Object.entries(raw));
}

function getStaff(userId) {

  if (!staffStats.has(userId)) {

    staffStats.set(userId, {

      claimed: 0,

      closed: 0,

      words: 0

    });

  }

  return staffStats.get(userId);

}

function saveLeaderboard() {

  fs.writeFileSync(

    DATA_FILE,

    JSON.stringify(

      Object.fromEntries(staffStats),

      null,

      2

    )

  );

}

/* ================= CLAIM CACHE ================= */

const claimedTickets = new Map();

/* ================= STAFF ROLES ================= */

const staffRoles = [

  "1474440409848479745",

  "1465642372405919785",

  "1465368284944928869",

  "1462423468753817723",

  "1462423337220444316"

];

/* ================= CLIENT ================= */

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.MessageContent

  ]

});

/* ================= COMMANDS ================= */

const commands = [

  new SlashCommandBuilder()

    .setName("ticket")

    .setDescription("Open ticket panel")

    .toJSON(),

  announceData.toJSON()

];

const rest = new REST({

  version: "10"

});

async function registerCommands() {

  rest.setToken(token);

  await rest.put(

    Routes.applicationGuildCommands(

      clientId,

      guildId

    ),

    {

      body: commands

    }

  );

  console.log("Slash commands registered.");

}

/* ================= READY ================= */

client.once("ready", async () => {

  console.log(`${client.user.tag} is online.`);

  try {

    await registerCommands();

    console.log("Commands registered.");

  } catch (err) {

    console.error("Command register error:", err);

  }

  try {

    await cleanupOldLeaderboards(client);

  } catch (err) {

    console.error("Leaderboard cleanup failed:", err);

  }

  try {

    await updateLeaderboard(client, staffStats);

  } catch (err) {

    console.error(err);

  }

  setInterval(async () => {

    try {

      await updateLeaderboard(client, staffStats);

    } catch (err) {

      console.error(err);

    }

  }, 5 * 60 * 1000);

});

/* ================= CREATE TICKET ================= */

async function createTicket(interaction, type, emoji) {

  try {

    const channel = await interaction.guild.channels.create({

      name: `${type}-${interaction.user.username}`,

      parent: ticketCategoryId,

      topic: interaction.user.id,

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

      .setColor("Green")

      .setTitle(`${emoji} ${type.toUpperCase()} TICKET`)

      .setDescription(
`Welcome <@${interaction.user.id}>!

A staff member will be with you shortly.

Please explain your concern in detail.`
      )

      .addFields(

        {
          name: "Ticket Owner",
          value: `<@${interaction.user.id}>`,
          inline: true
        },

        {
          name: "Status",
          value: "🟡 Waiting for Staff",
          inline: true
        }

      )

      .setTimestamp();

    const buttons = new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()

          .setCustomId("claim_ticket")

          .setLabel("Claim")

          .setEmoji("🎫")

          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()

          .setCustomId("close_ticket")

          .setLabel("Close")

          .setEmoji("🔒")

          .setStyle(ButtonStyle.Danger)

      );

    const roleMentions =
      staffRoles.map(id => `<@&${id}>`).join(" ");

    await channel.send({

      content:
`${roleMentions}

<@${interaction.user.id}>`,

      embeds: [embed],

      components: [buttons]

    });

    return interaction.reply({

      content: `✅ Ticket created: ${channel}`,

      ephemeral: true

    });

  }

  catch (err) {

    console.error(err);

    if (!interaction.replied) {

      return interaction.reply({

        content: "❌ Failed to create ticket.",

        ephemeral: true

      });

    }

  }

}

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "announce") {
return announceExecute(interaction, staffRoles);
}
      if (interaction.commandName === "ticket") {

        const embed = new EmbedBuilder()
          .setTitle("🎫 Ticket System")
          .setDescription("Select a category:")
          .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("APPLY").setLabel("📄-Apply").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("REPORT").setLabel("👁‍🗨-Report").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("BUY").setLabel("🛒-Buy").setStyle(ButtonStyle.Success)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    if (interaction.isButton()) {

      if (interaction.customId === "support")
        return createTicket(interaction, "support", "🛠");

      if (interaction.customId === "report")
        return createTicket(interaction, "report", "🚨");

      if (interaction.customId === "buy")
        return createTicket(interaction, "buy", "💰");

if (interaction.customId === "claim_ticket") {

  const isStaff = staffRoles.some(role =>
    interaction.member.roles.cache.has(role)
  );

  if (!isStaff) {
    return interaction.reply({
      content: "❌ Only staff can claim tickets.",
      ephemeral: true
    });
  }

  if (claimedTickets.has(interaction.channel.id)) {
    return interaction.reply({
      content: `⚠️ This ticket has already been claimed by <@${claimedTickets.get(interaction.channel.id)}>`,
      ephemeral: true
    });
  }

  claimedTickets.set(
    interaction.channel.id,
    interaction.user.id
  );

  const stats = getStaff(interaction.user.id);

  stats.claimed++;

  saveLeaderboard();

  await updateLeaderboard(client, staffStats);

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);

  embed.spliceFields(
    1,
    1,
    {
      name: "Status",
      value: `🟢 Claimed by <@${interaction.user.id}>`,
      inline: true
    }
  );

  await interaction.update({
    embeds: [embed],
    components: interaction.message.components
  });

  await interaction.followUp({
    content: `🎫 Ticket claimed by <@${interaction.user.id}>`
  });

}
      
      if (interaction.customId === "close_ticket") {

  const isStaff = staffRoles.some(role =>
    interaction.member.roles.cache.has(role)
  );

  if (!isStaff) {
    return interaction.reply({
      content: "❌ Only staff members can close tickets.",
      ephemeral: true
    });
  }

  const claimedBy = claimedTickets.get(interaction.channel.id);

  if (!claimedBy) {
    return interaction.reply({
      content: "❌ This ticket has not been claimed yet.",
      ephemeral: true
    });
  }

  if (claimedBy !== interaction.user.id) {
    return interaction.reply({
      content: `❌ Only <@${claimedBy}> can close this ticket.`,
      ephemeral: true
    });
  }

  // Add close to leaderboard
  const stats = getStaff(interaction.user.id);
  stats.closed++;

  saveLeaderboard();
  await updateLeaderboard(client, staffStats);

  await interaction.reply({
    content: "🔒 Closing ticket...",
    ephemeral: true
  });

  const channel = interaction.channel;

  try {

    const messages = await channel.messages.fetch({ limit: 100 });

    const transcript = messages
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map(msg =>
        `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}`
      )
      .join("\n");

    const file = `./${channel.id}.txt`;

    fs.writeFileSync(file, transcript);

    const logChannel = await client.channels.fetch(transcriptChannelId);

    if (logChannel) {
      await logChannel.send({
        content:
`📄 **Ticket Closed**

👤 Closed By: <@${interaction.user.id}>
🎫 Ticket: ${channel.name}`,
        files: [file]
      });
    }

    fs.unlinkSync(file);

  } catch (err) {
    console.error("Transcript error:", err);
  }

  claimedTickets.delete(channel.id);

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 3000);

  return;
    }
      return interaction.reply({
        content: "Unknown button.",
        ephemeral: true
      });
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "Error occurred.",
        ephemeral: true
      });
    }
  }
});

/* ================= WORD COUNTER ================= */

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.guild) return;

  // Only count messages inside ticket channels
  if (message.channel.parentId !== ticketCategoryId) return;

  // Only count staff messages
  const isStaff = staffRoles.some(role =>
    message.member.roles.cache.has(role)
  );

  if (!isStaff) return;

  // Only count if the ticket has been claimed
  const claimedBy = claimedTickets.get(message.channel.id);

  if (!claimedBy) return;

  // Only count the staff member who claimed the ticket
  if (claimedBy !== message.author.id) return;

  const words = message.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const stats = getStaff(message.author.id);

  stats.words += words;

  saveLeaderboard();

});

/* ================= LOGIN ================= */
client.login(token);
