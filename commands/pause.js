module.exports = {
    name: 'pause',
    description: 'Pause the player.',
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.pause());
	},
};