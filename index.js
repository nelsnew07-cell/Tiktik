import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

import fs from "fs";

import {
  updateLeaderboard,
  cleanupOldLeaderboards,
  sendLeaderboardDM
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

/* ================= STAFF ROLES ================= */

const staffRoles = [
  "1474440409848479745",
  "1465642372405919785",
  "1465368284944928869",
  "1462423468753817723",
  "1462423337220444316"
];

const pointManagers = [
  "785097608392605764",
  "690727923388383294",
  "898548067060572212"
];

/* ================= DATA ================= */

const DATA_FILE = "./staffStats.json";

let staffStats = new Map();

if (fs.existsSync(DATA_FILE)) {
  staffStats = new Map(
    Object.entries(
      JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))
    )
  );
}

const claimedTickets = new Map();

function getStaff(userId) {

  if (!staffStats.has(userId)) {

    staffStats.set(userId, {
  closed: 0,
  claimed: 0,
  words: 0,
  bonus: 0
});
    
  }

  const staff = staffStats.get(userId);

if (staff.bonus === undefined) {
  staff.bonus = 0;
}

return staff;
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
    .setDescription("Open the ticket panel")
    .toJSON(),

new SlashCommandBuilder()
  .setName("setpoints")
  .setDescription("Set bonus points for a staff member")
  .addUserOption(option =>
    option
      .setName("staff")
      .setDescription("Staff member")
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option
      .setName("points")
      .setDescription("Bonus points")
      .setRequired(true)
  )
  .toJSON(),
  
  announceData.toJSON()
];

const rest = new REST({ version: "10" });

async function registerCommands() {
  try {

    rest.setToken(token);

    await rest.put(
      Routes.applicationGuildCommands(
        clientId,
        guildId
      ),
      { body: commands }
    );

    console.log("✅ Slash commands registered.");

  } catch (err) {
    console.error("Command registration failed:", err);
  }
}

/* ================= READY ================= */

client.once("ready", async () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

  await registerCommands();

  await cleanupOldLeaderboards(client);

  await updateLeaderboard(client, staffStats);

  setInterval(async () => {

    await updateLeaderboard(client, staffStats);

  }, 5 * 60 * 1000);

  setInterval(async () => {
  await sendLeaderboardDM(client, staffStats);
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

Please don't Ping staff hehe na Ping napo kami ng ticket bot.

A staff member will assist you shortly.`
      )

      .addFields(

        {
          name: "👤 Ticket Owner",
          value: `<@${interaction.user.id}>`,
          inline: true
        },

        {
          name: "📌 Status",
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

  } catch (err) {

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

    /* ================= SLASH COMMANDS ================= */

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "announce") {
        return announceExecute(interaction, staffRoles);
      }

      if (interaction.commandName === "setpoints") {

  if (!pointManagers.includes(interaction.user.id)) {
  return interaction.reply({
    content: "❌ You are not authorized to use this command.",
    ephemeral: true
  });
  }

  const user = interaction.options.getUser("staff");
  const points = interaction.options.getInteger("points");

  const stats = getStaff(user.id);

  stats.bonus = points;

  saveLeaderboard();
  await updateLeaderboard(client, staffStats);

  return interaction.reply({
    content: `✅ Set **${user.tag}**'s bonus points to **${points}**.`,
    ephemeral: true
  });

}
      
      if (interaction.commandName === "ticket") {

        const embed = new EmbedBuilder()

          .setColor("Blue")

          .setTitle("🎫 Ticket System")

          .setDescription(
`Choose the type of ticket you want to open.`
          );

        const row = new ActionRowBuilder()

          .addComponents(

            new ButtonBuilder()
              .setCustomId("support")
              .setLabel("Support")
              .setEmoji("🛠")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("report")
              .setLabel("Report")
              .setEmoji("🚨")
              .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
              .setCustomId("buy")
              .setLabel("Buy")
              .setEmoji("🛒")
              .setStyle(ButtonStyle.Success)

          );

        return interaction.reply({

          embeds: [embed],

          components: [row]

        });

      }

    }
        /* ================= BUTTONS ================= */

    if (interaction.isButton()) {

      /* ---------- CREATE TICKETS ---------- */

      if (interaction.customId === "support") {
        return createTicket(interaction, "support", "🛠");
      }

      if (interaction.customId === "report") {
        return createTicket(interaction, "report", "🚨");
      }

      if (interaction.customId === "buy") {
        return createTicket(interaction, "buy", "🛒");
      }

      /* ---------- CLAIM TICKET ---------- */

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
            content: `⚠️ This ticket is already claimed by <@${claimedTickets.get(interaction.channel.id)}>.`,
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

        embed.spliceFields(1, 1, {
          name: "📌 Status",
          value: `🟢 Claimed by <@${interaction.user.id}>`,
          inline: true
        });

        await interaction.update({
          embeds: [embed],
          components: interaction.message.components
        });

        return interaction.followUp({
          content: `🎫 Ticket claimed by <@${interaction.user.id}>`
        });

      }
            /* ---------- CLOSE TICKET ---------- */

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
            content: "❌ This ticket hasn't been claimed yet.",
            ephemeral: true
          });
        }

        if (claimedBy !== interaction.user.id) {
          return interaction.reply({
            content: `❌ Only <@${claimedBy}> can close this ticket.`,
            ephemeral: true
          });
        }

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

          const messages = await channel.messages.fetch({
            limit: 100
          });

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

    console.error("Interaction Error:", err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Something went wrong.",
        ephemeral: true
      });
    }

  }

});

/* ================= WORD COUNTER ================= */

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.guild) return;

  if (!claimedTickets.has(message.channel.id)) return;

  const staffId = claimedTickets.get(message.channel.id);

  if (message.author.id !== staffId) return;

  const stats = getStaff(staffId);

  const words = message.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  stats.words += words;

  saveLeaderboard();

});

/* ================= LOGIN ================= */
client.login(token);
