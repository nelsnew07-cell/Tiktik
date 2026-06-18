const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

/* ================= CONFIG ================= */
const LEADERBOARD_CHANNEL_ID = "1490201609047773346";
const LEADERBOARD_STATE_FILE = path.join(__dirname, "leaderboardState.json");

/* ================= PERSISTENCE ================= */
function loadLeaderboardMessageId() {
  try {
    const data = JSON.parse(fs.readFileSync(LEADERBOARD_STATE_FILE, "utf8"));
    return data.leaderboardMessageId || null;
  } catch {
    return null;
  }
}

function saveLeaderboardMessageId(id) {
  fs.writeFileSync(
    LEADERBOARD_STATE_FILE,
    JSON.stringify({ leaderboardMessageId: id }, null, 2)
  );
}

let leaderboardMessageId = loadLeaderboardMessageId() || "1517004197311025264";

/* ================= ONE-TIME CLEANUP ================= */
async function cleanupOldLeaderboards(client, keepId) {
  const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);
  const messages = await channel.messages.fetch({ limit: 50 });

  const toDelete = messages.filter(
    (m) => m.author.id === client.user.id && m.id !== keepId
  );

  for (const m of toDelete.values()) {
    await m.delete().catch(() => {});
  }

  console.log(`Cleaned up ${toDelete.size} old leaderboard message(s).`);
}

/* ================= LEADERBOARD ================= */
async function updateLeaderboard(client, ticketCount) {
  try {
    const channel = await client.channels.fetch(LEADERBOARD_CHANNEL_ID);

    const sorted = [...ticketCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const description = sorted.length
      ? sorted
          .map((x, i) => {
            const medal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
            return `${medal} <@${x[0]}> — **${x[1]} tickets**`;
          })
          .join("\n")
      : "No tickets yet.";

    const embed = new EmbedBuilder()
      .setTitle("🏆 Ticket Leaderboard")
      .setDescription(description)
      .setColor("Gold")
      .setTimestamp();

    let msg = null;

    if (leaderboardMessageId) {
      msg = await channel.messages.fetch(leaderboardMessageId).catch(() => null);
    }

    if (msg) {
      await msg.edit({ embeds: [embed] });
    } else {
      msg = await channel.send({ embeds: [embed] });
      leaderboardMessageId = msg.id;
      saveLeaderboardMessageId(msg.id);
    }
  } catch (err) {
    console.error("Leaderboard error:", err);
  }
}

module.exports = {
  updateLeaderboard,
  cleanupOldLeaderboards,
};
