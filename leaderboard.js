import fs from "fs";
import { EmbedBuilder } from "discord.js";

/* ================= CONFIG ================= */

const LEADERBOARD_CHANNEL_ID = "1490201609047773346";
const STATE_FILE = "./leaderboardState.json";
const DM_USER_ID = "690727923388383294";

/* ================= MESSAGE ID ================= */

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2)
  );
}

const state = loadState();

let leaderboardMessageId = state.leaderboardMessageId || null;
let dmLeaderboardMessageId = state.dmLeaderboardMessageId || null;

/* ================= CLEANUP ================= */

export async function cleanupOldLeaderboards(client) {
  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 100 });

  const botMessages = messages.filter(
    m => m.author.id === client.user.id
  );

  for (const msg of botMessages.values()) {
    if (msg.id !== leaderboardMessageId) {
      await msg.delete().catch(() => {});
    }
  }
}

/* ================= LEADERBOARD ================= */

export async function updateLeaderboard(client, staffStats) {
  try {
    const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
    if (!channel) return;

    const sorted = [...staffStats.entries()]
      .sort((a, b) => {
        const scoreA =
  a[1].closed +
  a[1].claimed +
  Math.floor(a[1].words / 5) +
  (a[1].bonus || 0);

const scoreB =
  b[1].closed +
  b[1].claimed +
  Math.floor(b[1].words / 5) +
  (b[1].bonus || 0);
        return scoreB - scoreA;
      })
      .slice(0, 10);

    let description = "";

    if (!sorted.length) {
      description = "No staff activity yet.";
    } else {
      description = sorted
        .map(([id, stats], index) => {
          const score =
  stats.closed +
  stats.claimed +
  Math.floor(stats.words / 5) +
  stats.bonus;

          return `**#${index + 1}** <@${id}>
• Score: **${score}**`;
        })
        .join("\n\n");
    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🏆 Staff Leaderboard")
      .setDescription(description)
      .setTimestamp();

    if (leaderboardMessageId) {
      try {
        const msg = await channel.messages.fetch(leaderboardMessageId);
        await msg.edit({ embeds: [embed] });
        return;
      } catch {}
    }

    const msg = await channel.send({ embeds: [embed] });
leaderboardMessageId = msg.id;

saveState({
  leaderboardMessageId
});
    
  } catch (err) {
    console.error("Leaderboard update failed:", err);
  }
}

export async function sendLeaderboardDM(client, staffStats) {
  try {

    const sorted = [...staffStats.entries()]
      .sort((a, b) => {

        const scoreA =
          a[1].closed +
          a[1].claimed +
          Math.floor(a[1].words / 5) +
          (a[1].bonus || 0);

        const scoreB =
          b[1].closed +
          b[1].claimed +
          Math.floor(b[1].words / 5) +
          (b[1].bonus || 0);

        return scoreB - scoreA;

      })
      .slice(0, 10);

    let description = "";

    if (!sorted.length) {

      description = "No staff activity yet.";

    } else {

      description = sorted
        .map(([id, stats], index) => {

          const score =
            stats.closed +
            stats.claimed +
            Math.floor(stats.words / 5) +
            (stats.bonus || 0);

          return `**#${index + 1}** <@${id}>
• Score: **${score}**`;

        })
        .join("\n\n");

    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("🏆 Staff Leaderboard")
      .setDescription(description)
      .setTimestamp();

    const user = await client.users.fetch(DM_USER_ID);

    await user.send({
      embeds: [embed]
    });

  } catch (err) {

    console.error("Failed to send leaderboard DM:", err);

  }
}
