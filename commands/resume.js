module.exports = {
    name: 'resume',
    description: 'Resume the player.',
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.resume());
	},
};