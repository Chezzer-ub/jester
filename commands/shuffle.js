module.exports = {
    name: 'shuffle',
    description: 'Shuffles current queue.',
    aliases: ['random'],
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.shuffle());
	},
};