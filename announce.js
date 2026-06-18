import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Make the bot send a message')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Message to send')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const message = interaction.options.getString('message');

    await interaction.channel.send(message);

    await interaction.reply({
      content: '✅ Announcement sent!',
      ephemeral: true
    });
  }
};
