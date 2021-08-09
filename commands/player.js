module.exports = {
    name: 'player',
    description: 'Get server music player.',
    aliases: ['np', 'playing', 'nowplaying'],
    async execute(msg, args, bot) {
      let player = bot.player.get(msg.guild.id);
      msg.channel.send(player.player().embed, player.player().buttons).then(async (msg) => {
        if (player.nowPlayingUpdate) {
          clearInterval(player.nowPlayingUpdate);
        }
        if (player.nowPlayingMessage) {
          await player.nowPlayingMessage.delete();
        }
        player.nowPlayingMessage = msg;
        player.nowPlayingUpdate = setInterval(() => {
          if (player.nowPlayingMessage) {
            player.nowPlayingMessage.edit(player.player().embed, player.player().buttons);
          }
      }, 15000)
      });
	  },
};