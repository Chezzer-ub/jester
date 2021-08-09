module.exports = {
    name: 'stop',
    description: 'Stop & disconnect the player.',
    aliases: ['end', 'leave', 'disconnect', 'dis'],
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      if (player) {
        msg.channel.send(player.stop()); 
      } else {
        msg.channel.send("❌ Player already stopped.")
      }
  },
};