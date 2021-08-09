module.exports = {
    name: 'skip',
    description: 'Skip the current song.',
    aliases: ['fs', 's'],
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.skip());
  },
};