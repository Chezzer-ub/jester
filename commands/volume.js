module.exports = {
    name: 'volume',
    description: 'Change the volume of the player.',
    aliases: ['v', 'vol'],
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.setVolume(args.join("")));
	  },
};