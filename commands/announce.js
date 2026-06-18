import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
.setName("announce")
.setDescription("Make the bot send a message")
.addStringOption(option =>
option
.setName("message")
.setDescription("Message to send")
.setRequired(true)
);

export async function execute(interaction, staffRoles) {
const isStaff = staffRoles.some(roleId =>
interaction.member.roles.cache.has(roleId)
);

if (!isStaff) {
return interaction.reply({
content: "❌ Only staff can use this command.",
ephemeral: true
});
}

const message = interaction.options.getString("message");

await interaction.channel.send(message);

return interaction.reply({
content: "✅ Announcement sent.",
ephemeral: true
});
}
