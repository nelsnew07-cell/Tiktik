import fs from "fs";
import { EmbedBuilder } from "discord.js";

/* ================= CONFIG ================= */

const LEADERBOARD_CHANNEL_ID = "1490201609047773346";
const STATE_FILE = "./leaderboardState.json";

/* ================= MESSAGE ID ================= */

function loadMessageId() {
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return data.messageId || null;
  } catch {
    return null;
  }
}

function saveMessageId(id) {
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ messageId: id }, null, 2)
  );
}

let leaderboardMessageId = loadMessageId();

/* ================= CLEANUP ================= */

async function cleanupOldLeaderboards(client) {

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

async function updateLeaderboard(client, staffStats) {

  try {

    const channel = await client.channels.fetch(
      LEADERBOARD_CHANNEL_ID
    );

    if (!channel) return;

    const sorted = [...staffStats.entries()]
      .sort((a, b) => {

        const scoreA =
          a[1].closed * 30 +
          a[1].claimed * 20 +
          Math.floor(a[1].words / 5);

        const scoreB =
          b[1].closed * 30 +
          b[1].claimed * 20 +
          Math.floor(b[1].words / 5);

        return scoreB - scoreA;

      })
      .slice(0, 10);

    let description = "";

    if (!sorted.length) {

      description = "No staff activity yet.";

    } else {

      sorted.forEach
