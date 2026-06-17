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

/* ================= RAILWAY VARIABLES ================= */
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const staffRoleId = process.env.STAFFROLE_ID;

/* ================= CATEGORY ================= */
const ticketCategoryId = "1470085301941702838";

/* ================= LEADERBOARD ================= */
const LEADERBOARD_CHANNEL_ID = "1490201609047773346";

const DATA_FILE = "./leaderboard.json";

let ticketCount = new Map();

if (fs.existsSync(DATA_FILE)) {
  const data = JSON.parse(
    fs.readFileSync(DATA_FILE, "utf8")
  );

  ticketCount = new Map(Object.entries(data));
}

let leaderboardMessageId = null;

function saveLeaderboard() {
  const data = Object.fromEntries(ticketCount);

  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

/* ================= STAFF ROLE IDS (EXCEPT REMOVED ONE) ================= */
const staffRoles = [
  "1474440409848479745",
  "1465642372405919785",
  "1465368284944928869",
  "1462423468753817723",
  "1462423337220444316"
  // ❌ 690727923388383294 REMOVED
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

  // Create/update leaderboard shortly after startup
  setTimeout(() => {
    updateLeaderboard();
  }, 5000);

  // Refresh leaderboard every 5 minutes
  setInterval(() => {
    updateLeaderboard();
  }, 5 * 60 * 1000);
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

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  // leaderboard count
  ticketCount.set(
    interaction.user.id,
    Number(ticketCount.get(interaction.user.id) || 0) + 1
  );

  if (typeof saveLeaderboard === "function") {
    saveLeaderboard();
  }

  if (typeof updateLeaderboard === "function") {
    updateLeaderboard();
  }

  return interaction.reply({
    content: `Ticket created: ${channel}`,
    ephemeral: true
  });
}
  // Send ticket message
  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  // Update leaderboard
  ticketCount.set(
    interaction.user.id,
    Number(ticketCount.get(interaction.user.id) || 0) + 1
  );

  if (typeof saveLeaderboard === "function") {
    saveLeaderboard();
  }

  if (typeof updateLeaderboard === "function") {
    updateLeaderboard();
  }

  return interaction.reply({
    content: `Ticket created: ${channel}`,
    ephemeral: true
  });
}

  // Send ticket message
  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  // Update leaderboard count
  ticketCount.set(
    interaction.user.id,
    Number(ticketCount.get(interaction.user.id) || 0) + 1
  );

  // Save to file (persistent leaderboard)
  saveLeaderboard();

  // Update leaderboard channel
  updateLeaderboard();

  // Reply to user
  return interaction.reply({
    content: `Ticket created: ${channel}`,
    ephemeral: true
  });
}

  /* ================= ROLE MENTIONS (UPDATED) ================= */
const roleMentions = staffRoles.map(id => `<@&${id}>`).join(" ");

await channel.send({
  content: `${roleMentions} | <@${interaction.user.id}>`,
  embeds: [embed],
  components: [row]
});

// 🎫 increase ticket count
ticketCount.set(
  interaction.user.id,
  Number(ticketCount.get(interaction.user.id) || 0) + 1
);

// 💾 save leaderboard data
if (typeof saveLeaderboard === "function") {
  saveLeaderboard();
}

// 📊 update leaderboard channel
if (typeof updateLeaderboard === "function") {
  updateLeaderboard();
}

// ✅ reply to user (IMPORTANT: must stay inside function)
return interaction.reply({
  content: `Ticket created: ${channel}`,
  ephemeral: true
});

/* ================= LEADERBOARD SYSTEM ================= */
async function updateLeaderboard() {
  try {
    const channel = await client.channels.fetch(
      LEADERBOARD_CHANNEL_ID
    );

    const sorted = [...ticketCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const medals = ["🥇", "🥈", "🥉"];

    const description = sorted.length
      ? sorted
          .map((x, i) => {
            const medal = medals[i] || `#${i + 1}`;
            return `${medal} <@${x[0]}> — **${x[1]} tickets**`;
          })
          .join("\n")
      : "No tickets yet.";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ticket Leaderboard")
      .setDescription(description)
      .setColor("Gold")
      .setFooter({
        text: "Auto-updates every 5 minutes"
      })
      .setTimestamp();

    if (!leaderboardMessageId) {
      const messages = await channel.messages.fetch({
        limit: 20
      });

      const existing = messages.find(
        m =>
          m.author.id === client.user.id &&
          m.embeds.length > 0 &&
          m.embeds[0].title === "🏆 Ticket Leaderboard"
      );

      if (existing) {
        leaderboardMessageId = existing.id;

        await existing.edit({
          embeds: [embed]
        });

        return;
      }

      const msg = await channel.send({
        embeds: [embed]
      });

      leaderboardMessageId = msg.id;
    } else {
      const msg = await channel.messages.fetch(
        leaderboardMessageId
      );

      await msg.edit({
        embeds: [embed]
      });
    }
  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {

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
