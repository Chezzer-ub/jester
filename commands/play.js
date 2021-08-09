module.exports = {
    name: 'play',
    description: 'Search or play a song from YouTube or Spotify.',
    aliases: ['p'],
    async execute(msg, args, bot) {
      const ytdl = require("ytdl-core"), ytpl = require("ytpl"), ytsr = require("ytsr");
      const Discord = require('discord.js');

      bot.initPlayer(msg.guild.id)

      let player = bot.player.get(msg.guild.id);

      const voiceChannel = msg.member.voice.channel;
      if (!voiceChannel) return msg.channel.send("❌ You are not in a voice channel, please join one first!")

      const permissions = voiceChannel.permissionsFor(msg.guild.me)
      if (!permissions.has("CONNECT")) return msg.channel.send("❌ I don't have permission to connect to the voice channel!")
      if (!permissions.has("SPEAK")) return msg.channel.send("❌ I don't have permission to speak in the voice channel!")
      if (!args.length) return msg.channel.send(player.resume());
      
      const url = args.join(" ")

      if (url.includes("list=")) {
        const playlist = await ytpl(url.split("list=")[1]);

        if (playlist.items.length) {
          for (const video of playlist.items) await queueSong(video)
          player.start(voiceChannel, msg.channel);
          player.songHistory = [];
          await msg.channel.send(`✅ **${playlist.items.length}** songs have been added to the queue!`)
        } else {
          return msg.channel.send("❌ Playlist is empty!")
        }
      } else if (url.includes("watch?v=")) {
        let video;
        try {
          video = await ytdl.getBasicInfo(url)
        } catch(e) {
          console.log(e)
          msg.channel.send("❌ Error getting song data, maybe its copyrighted?");
        }

        await msg.channel.send(`✅ Song **${video.videoDetails.title}** has been added to the queue!`)
        video.videoDetails.formats = video.formats;
        queueSong(video.videoDetails)
        player.start(voiceChannel, msg.channel);
      } else if (url.includes("open.spotify.com/track/")) {
        let id = url.split("https://open.spotify.com/track/")[1];
        id = id.split("?")[0];
        bot.spotify.getTrack(id)
        .then(async (data) => {
          data = data.body;
          const results = await ytsr(`${data.artists[0].name} - ${data.name}`, { limit: 1 })
          var video = results.items[0];
          video = await ytdl.getURLVideoID(video.url)
          try {
            video = await ytdl.getBasicInfo(video)
          } catch (e) {
            return msg.channel.send("❌ Can't find that song. Is the URL correct?")
          }
          await msg.channel.send(`✅ Song **${video.videoDetails.title}** has been added to the queue!`)
          video.videoDetails.formats = video.formats;
          queueSong(video.videoDetails)
          player.start(voiceChannel, msg.channel);
        }, (err) => {
          msg.channel.send("❌ Something went wrong when contacting Spotify.")
        })
      } else if (url.includes("open.spotify.com/playlist/")) {
        let id = url.split("https://open.spotify.com/playlist/")[1];
        id = id.split("?")[0];
        bot.spotify.getPlaylist(id)
        .then(async (data) => {
          data = data.body;
          player.songHistory = [];
          data.tracks.items.forEach(async (item) => {
            item = item.track;
            const results = await ytsr(`${item.artists[0].name} - ${item.name}`, { limit: 1 })
            var video = results.items[0];
            video = await ytdl.getURLVideoID(video.url)
            try {
              video = await ytdl.getBasicInfo(video)
            } catch (e) {
              return msg.channel.send("❌ Can't find that song. Is the URL correct?")
            }
            video.videoDetails.formats = video.formats;
            queueSong(video.videoDetails)
          })
          await msg.channel.send(`✅ **${data.tracks.items.length}** songs have been added to the queue!`)
          player.start(voiceChannel, msg.channel);
        }, (err) => {
          msg.channel.send("❌ Something went wrong when contacting Spotify.")
        })
      } else {
        let video;
        try {
          const results = await ytsr(url, { limit: 5 })
          const videos = results.items

          if (!videos.length) return msg.channel.send("❌ No search results found.")
        
          // await msg.channel.send([
          //   "__**Song selection:**__",
          //   videos.map(v => `${++index} - **${v.title}**`).join("\n"),
          //   `**Select your song by sending the number from 1 to ${videos.length} in chat.**`
          // ].join("\n\n"))

          let searchString = "";
          videos.forEach((item, i) => {
            searchString += `\`${i+1}\` [${item.title}](${item.url}) \`${item.duration}\`\n`;
          })

          const embed = new Discord.MessageEmbed()
          .setTitle(`"${url}"`)
          .setColor("#2F3136")
          .setDescription(searchString)
          .setFooter("Please type in chat which song you would like to queue. You have 30 seconds.");

          await msg.channel.send(embed);
        
          let response;
          try {
            response = await msg.channel.awaitMessages(msg => 0 < parseInt(msg.content) && parseInt(msg.content) < videos.length + 1 && msg.author.id == msg.author.id, {
              max: 1,
              time: 30000,
              errors: ['time']
            });
          } catch(e) {
            console.log(e)
            return msg.channel.send("❌ Video selection timed out.")
          }
          const videoIndex = parseInt(response.first().content)
          video = await ytdl.getURLVideoID(videos[videoIndex - 1].url)
          try {
            video = await ytdl.getBasicInfo(video)
          } catch (e) {
            return msg.channel.send("❌ Can't find that song. Is the URL correct?")
          }
          await msg.channel.send(`✅ Song **${video.videoDetails.title}** has been added to the queue!`)
          video.videoDetails.formats = video.formats;
          queueSong(video.videoDetails)
          player.start(voiceChannel, msg.channel);
        } catch(e) {
          console.log(e)
          msg.channel.send("❌ An unknown error occurred.")
        }
      }

      function queueSong(song) {
        song.user = msg.author.id;
        if (!song.url) song.url = song.video_url;
        if (!song.duration) song.duration = bot.secondsToString(song.lengthSeconds);
        if (!song.id) song.id = song.videoId;
        player.queue.push(song);
      }
	},
};