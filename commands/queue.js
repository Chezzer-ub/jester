module.exports = {
    name: 'queue',
    description: 'View server\'s current queue.',
    aliases: ['q', 'upnext'],
    async execute(msg, args, bot) {
      const Discord = require('discord.js');
      if (!bot.player.has(msg.guild.id)) return msg.channel.send("❌ Play something first.");

      let player = bot.player.get(msg.guild.id);

      let queueString = "";

      if (player.playing) queueString = "__Now Playing__\n";

      let queue = player.queue;
      queue.forEach((song, i) => {
        if (i <= 10) {
          queueString += `\`${i+1}\` [${song.title}](${song.url}) - \`${song.duration}\` <@${song.user}>\n`;
        }
        if (i == 0) {
          queueString += "\n";
        }
      })

      queueString += `\n${queue.length} songs in queue`;
      const embed = new Discord.MessageEmbed()
      .setTitle(`${msg.guild.name}'s server music queue`)
      .setColor("#2F3136")
      .setDescription(queueString)
      msg.channel.send(embed);
	},
};