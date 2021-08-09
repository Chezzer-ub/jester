module.exports = {
    name: 'join',
    description: 'Join your voice channel.',
    async execute(msg, args, bot) {
      const voiceChannel = msg.member.voice.channel;
      if (!voiceChannel) return msg.channel.send("❌ You are not in a voice channel, please join one first!")
      msg.channel.send(voiceChannel.join());
	},
};