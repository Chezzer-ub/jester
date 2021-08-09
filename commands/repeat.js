module.exports = {
    name: 'repeat',
    description: 'Toggle repeat state on player. Can be `song`, `playlist`, `off`.',
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.setRepeat(args[0]));
	  },
};