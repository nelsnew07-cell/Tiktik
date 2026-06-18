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

/* ================= ENV ================= */
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const staffRoleId = process.env.STAFFROLE_ID;

/* ================= IDS ================= */
const ticketCategoryId = "1470085301941702838";
const TRANSCRIPT_LOG_CHANNEL = "1490027750608867578";
const LEADERBOARD_CHANNEL_ID = "1490201609047773346";

/* ================= DATA ================= */
const DATA_FILE = "./leaderboard.json";

let ticketCount = new Map();

if (fs.existsSync(DATA_FILE)) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  ticketCount = new Map(Object.entries(data));
}

let leaderboardMessageId = null;

const claimedTickets = new Map();

function saveLeaderboard() {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(Object.fromEntries(ticketCount), null, 2)
  );
}

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
  intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */
const commands = [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Open ticket panel")
    .toJSON()
];

const rest = new REST({ version: "10" });

async function registerCommands() {
  try {
    rest.setToken(token);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log("Slash commands registered");
  } catch (err) {
    console.error(err);
  }
}

/* ================= READY ================= */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await registerCommands();

  updateLeaderboard();
  setInterval(updateLeaderboard, 5 * 60 * 1000);
});

/* ================= CREATE TICKET ================= */
async function createTicket(interaction, type, emoji) {
  try {
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
      .setDescription("Please wait for staff.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("claim_ticket")
    .setLabel("Claim Ticket")
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("Close Ticket")
    .setStyle(ButtonStyle.Danger)
);
    const roleMentions = staffRoles.map(id => `<@&${id}>`).join(" ");

    await channel.send({
      content: `${roleMentions} | <@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `Ticket created: ${channel}`,
      ephemeral: true
    });

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "Failed to create ticket.",
        ephemeral: true
      });
    }
  }
}

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "ticket") {

        const embed = new EmbedBuilder()
          .setTitle("🎫 Ticket System")
          .setDescription("Select a category:")
          .setColor("Blue");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("support").setLabel("📄-Apply").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("report").setLabel("👁‍🗨-Report").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("buy").setLabel("🛒-Buy").setStyle(ButtonStyle.Success)
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

  const isStaff = staffRoles.some(roleId =>
    interaction.member.roles.cache.has(roleId)
  );

  if (!isStaff) {
    return interaction.reply({
      content: "❌ Only staff can claim tickets.",
      ephemeral: true
    });
  }

  if (claimedTickets.has(interaction.channel.id)) {
    return interaction.reply({
      content: `⚠️ This ticket is already claimed by <@${claimedTickets.get(interaction.channel.id)}>`,
      ephemeral: true
    });
  }

  claimedTickets.set(
    interaction.channel.id,
    interaction.user.id
  );

  return interaction.reply({
    content: `🎫 Ticket claimed by <@${interaction.user.id}>`
  });
}
      
      if (interaction.customId === "close_ticket") {

  const isStaff = staffRoles.some(roleId =>
    interaction.member.roles.cache.has(roleId)
  );

  if (!isStaff) {
    return interaction.reply({
      content: "❌ Only staff members can close tickets.",
      ephemeral: true
    });
  }

const claimedBy = claimedTickets.get(interaction.channel.id);

if (claimedBy) {
  ticketCount.set(
    claimedBy,
    (ticketCount.get(claimedBy) || 0) + 1
  );

  saveLeaderboard();
  updateLeaderboard();

  claimedTickets.delete(interaction.channel.id);
}
        
  await interaction.reply({
    content: "Closing ticket...",
    ephemeral: true
  });
        const channel = interaction.channel;

        try {
          const messages = await channel.messages.fetch({ limit: 100 });

          const transcript = messages
            .map(m => `${m.author.tag}: ${m.content}`)
            .reverse()
            .join("\n");

          const file = `./${channel.id}.txt`;
          fs.writeFileSync(file, transcript);

          const logChannel = await client.channels.fetch(TRANSCRIPT_LOG_CHANNEL);

          await logChannel.send({
            content: `Transcript for ${channel.name}`,
            files: [file]
          });

        } catch (err) {
          console.error("Transcript error:", err);
        }

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

/* ================= LEADERBOARD ================= */
async function updateLeaderboard() {
  try {
    const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

    const sorted = [...ticketCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const description = sorted.length
      ? sorted.map((x, i) =>
          `${["🥇","🥈","🥉"][i] || `#${i + 1}`} <@${x[0]}> — **${x[1]} tickets**`
        ).join("\n")
      : "No tickets yet.";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ticket Leaderboard")
      .setDescription(description)
      .setColor("Gold");

    let msg;

    if (leaderboardMessageId) {
      msg = await channel.messages.fetch(leaderboardMessageId).catch(() => null);
    }

    if (!msg) {
      msg = await channel.send({ embeds: [embed] });
      leaderboardMessageId = msg.id;
    } else {
      await msg.edit({ embeds: [embed] });
    }

  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

/* ================= LOGIN ================= */
client.login(token);
