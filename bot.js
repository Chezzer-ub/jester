const Discord = require('discord.js');
const fs = require('fs');
const ytdl = require("ytdl-core");
const express = require("express");
const api = express();
const axios = require("axios");
const bot = new Discord.Client();

bot.commands = new Discord.Collection();

bot.buttons = require('discord-buttons');
bot.buttons(bot);

var SpotifyWebApi = require('spotify-web-api-node');
bot.spotify = new SpotifyWebApi({
    clientId: '75f9d4e1e04446a887f60afc185802ba',
    clientSecret: '2aaa308dfc794012942fb4f02f784512',
    redirectUri: 'http://www.example.com/callback'
});

function getSpotifyToken() {
    axios.get("https://www.spotifycodes.com/getToken.php").then((data) => {
        bot.spotify.setAccessToken(data.data.access_token);
        console.log("Setting new access token " + data.data.access_token)
    })
}

setInterval(getSpotifyToken, 3600000)
getSpotifyToken()

api.use(express.json({ limit: '1mb' }));

api.post("/jester/api", (req, res) => {
    if (req.body.server) {
        const args = req.body.args.split(" ");
        let player = bot.player.get(req.body.server);
        if (args[0] == "resume") {
            player.resume();
        } else if (args[0] == "pause") {
            player.pause();
        } else if (args[0] == "stop") {
            player.stop();
        } else if (args[0] == "volume") {
            if (args[1]) player.setVolume(args[1]);
        } else if (args[0] == "skip") {
            player.skip();
        } else if (args[0] == "repeat") {
            player.repeat = args[1];
        } else if (args[0] == "shuffle") {
            player.shuffle();
        }
    }
    res.end();
})

api.listen(5274)

bot.player = new Map();

const config = JSON.parse(fs.readFileSync("config.json"));
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

bot.once('ready', () => {
    console.log('Ready!');
});

bot.on('message', async (msg) => {
    const content = msg.content;
    const args = content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift()

    if (!content.startsWith(config.prefix)) return;
    if (msg.author.bot) return;
    if (!command) return

    const foundCommand = bot.commands.get(command) || bot.commands.find(c => c.aliases && c.aliases.includes(command))
    if (!foundCommand) return

    try {
        await foundCommand.execute(msg, args, bot);
    } catch (error) {
        console.error(error);
    }
})

bot.handleInteraction = function(interaction, msg) {
    bot.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
            type: 4,
            data: {
                content: msg,
            }
        }
    }).catch((err) => {})
}

bot.initPlayer = function(guild) {
    if (bot.player.has(guild)) return bot.player.get(guild);
    bot.player.set(guild, {
        nowPlaying: null,
        nowPlayingMessage: null,
        nowPlayingUpdate: null,
        playing: false,
        queue: [],
        songHistory: [],
        voiceChannel: null,
        textChannel: null,
        connection: null,
        volume: 75,
        repeat: null,
        async start(vc, tc) {
            console.log(`Starting new player in ${vc.name}`);
            try {
                this.nowPlaying = this.queue[0];
                if (!this.voiceChannel) {
                    this.voiceChannel = vc;
                    this.textChannel = tc;
                }
                this.connection = await this.voiceChannel.join();
                if (this.nowPlayingUpdate) {
                    clearInterval(this.nowPlayingUpdate);
                }
                await this.textChannel.send(this.player().embed, this.player().buttons)
                .then(async (msg) => {
                    if (this.nowPlayingMessage) {
                        await this.nowPlayingMessage.delete();
                    }
                    this.nowPlayingMessage = msg;
                })
                this.nowPlayingUpdate = setInterval(() => {
                    this.updatePlayer()
                }, 15000)
                return this.play();
            } catch (e) {
                console.log(e)
                return "❌ Error joining voice channel.";
            }
        },
        updatePlayer() {
            if (this.nowPlayingMessage) {
                this.nowPlayingMessage.edit(this.player().embed, this.player().buttons);
            }
        },
        player() {
            const embed = new Discord.MessageEmbed()
            if (this.nowPlaying) {
                embed.setTitle(`${this.nowPlaying.title}`)
                .setThumbnail(this.nowPlaying.thumbnails[4] ? this.nowPlaying.thumbnails[4].url : this.nowPlaying.thumbnails[3].url)
                .setURL(this.nowPlaying.url)
                .addField(
                    "Channel",
                    this.nowPlaying.author.name,
                    true
                )
                .addField(
                    "Duration",
                    this.nowPlaying.duration,
                    true
                )
                if (this.nowPlaying.viewCount) {
                    embed.addField(
                        "Views",
                        this.nowPlaying.viewCount,
                        true
                    )
                    .addField(
                        "Upload Date",
                        this.nowPlaying.publishDate,
                        true
                    )
                }
                embed.addField(
                    "Requested By",
                    `<@${this.nowPlaying.user}>`,
                    true
                )
                .setDescription(`${this.connection.dispatcher ? bot.secondsToString(this.connection.dispatcher.totalStreamTime/1000) : "00:00"} / ${this.nowPlaying.duration}`)
                .setColor("#2F3136")
            } else {
                embed.setTitle("Nothing Playing").setColor("#2F3136");
            }

            let footer = [];
            if (this.paused) {
                footer.push("⏸ Player is paused.");
            }

            if (this.repeat == "playlist") {
                footer.push("🔁 Playlist")
            }

            if (this.repeat == "song") {
                footer.push("🔂 Song")
            }

            embed.setFooter(footer.join("| "))

            let playPauseButton = new bot.buttons.MessageButton()
            .setStyle('gray')
            .setEmoji('⏯')
            .setID('playpause')

            let stopButton = new bot.buttons.MessageButton()
            .setStyle('gray')
            .setEmoji('⏹')
            .setID('stop')


            let skipButton = new bot.buttons.MessageButton()
            .setStyle('gray')
            .setEmoji('⏩')
            .setID('skip')

            let shuffleButton = new bot.buttons.MessageButton()
            .setStyle('gray')
            .setEmoji('🔀')
            .setID('shuffle')

            let repeatButton = new bot.buttons.MessageButton()
            .setStyle('gray')
            .setID('repeat')

            if (this.repeat == "song") {
                repeatButton.setEmoji('🔂');
            } else if (this.repeat == "playlist") {
                repeatButton.setEmoji('🔁')
            } else {
                repeatButton.setEmoji("🔁")
            }

            let buttons = new bot.buttons.MessageActionRow()
            .addComponents(playPauseButton, skipButton, stopButton, shuffleButton, repeatButton);

            return {embed, buttons};
        },
        play() {
            if (!this.playing) {
                this.playing = true;
                if (this.queue.length) {
                    try {
                        this.nowPlaying = this.queue[0];
                        this.updatePlayer()
                        if (this.queue[0].formats) {
                            ytdl.chooseFormat(this.queue[0].formats, { quality: '134'})
                        }
                        this.connection.play(ytdl(this.queue[0].id, {highWaterMark: 1024}), { bitrate: 128, volume: this.volume/100 })
                        .on("speaking", async speaking => {
                            if (speaking == 0) {
                                if (this.repeat !== "song") {
                                    this.songHistory.unshift(this.queue[0]);
                                    this.queue.shift();
                                }
                                this.playing = false;
                                this.play();
                            }
                        })
                        .on("error", (e) => {
                            this.skip();
                            console.log(e);
                            return this.textChannel.send(`❌ Error playing **${this.queue[0].title}**`);
                        })
                        .setVolume(this.volume / 100)
                    } catch (e) {
                        console.log(e);
                        this.skip();
                        return this.textChannel.send(`❌ Error playing **${this.queue[0].title}**`);
                    }
                } else {
                    if (this.repeat == "playlist") {
                        this.queue = this.songHistory.reverse();
                        this.songHistory = [];
                        this.playing = false;
                        setTimeout(this.play, 1000)
                    } else {
                        if (this.textChannel) {
                            this.textChannel.send(`✔ Queue is finished`);
                        }
                        if (this.queue.length) {
                            this.skip();
                        } else {
                            this.stop();
                        }
                    }
                }
            } else {
                return `❌ Already Playing`;
            }
        },
        pause() {
            if (!this.queue.length) return "❌ Nothing in queue!";
            if (!this.playing) return "❌ Already paused!";
            if (!this.voiceChannel) return "❌ Not in a voice channel!";

            this.playing = false;
            this.connection.dispatcher.pause(true);
            return "⏸ The player has been paused!";
        },
        resume() {
            if (!this.queue.length) return "❌ Nothing in queue!";
            if (this.playing && !this.connection) return "❌ Already playing!";
            if (!this.voiceChannel) return "❌ Not in a voice channel!";

            this.playing = true;
            if (this.connection.dispatcher) {
                this.connection.dispatcher.resume();
            } else {
                this.songHistory.unshift(this.queue[0]);
                this.queue.shift();
                this.playing = false;
                this.play();
            }
            return "▶ The player has been resumed!";
        },
        stop() {
            if (!this.connection) return "❌ Nothing is playing!";
            if (!this.voiceChannel) return "❌ Not in a voice channel!";

            if (this.nowPlayingUpdate) {
                clearInterval(this.nowPlayingUpdate);
            }

            if (this.nowPlayingMessage) {
                this.nowPlayingMessage.delete();
            }
            
            this.voiceChannel.leave();
            if (this.connection.dispatcher) {
                setTimeout(() => {
                    this.connection.dispatcher.destroy();
                }, 500)
            }
            this.queue = [];
            this.songHistory = [];
            this.playing = false;
            this.nowPlaying = null;
            this.nowPlayingMessage = null;
            return "⏹ The player has stopped!";
        },
        skip() {
            if (!this.playing) return "❌ Nothing is playing!";
            if (!this.connection) return "❌ Nothing is playing!";
            if (!this.voiceChannel) return "❌ Not in a voice channel!";

            this.updatePlayer()

            this.playing = false;
            if (this.connection.dispatcher) {
                this.connection.dispatcher.end();
            } else {
                this.stop();
            }
            return "⏩ Skipped current song.";
        },
        setVolume(volume) {
            if (!volume) return `🔉 The volume is ${this.volume}%`;
            
            volume = Number(volume);

            if (!volume || volume > 300) return "❌ Invalid volume level, pick a number between 1% and 300%!";

            this.volume = volume;
            if (this.connection.dispatcher) {
                this.connection.dispatcher.setVolume(volume / 100);
            }

            return `🔊 The volume is now ${volume}%!`;
        },
        shuffle() {
            if (!this.queue) return "❌ No queue to shuffle.";

            let nowPlaying;
            let arr = this.queue;
            nowPlaying = arr[0];
            delete arr[0];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }

            arr.unshift(nowPlaying);

            this.queue = arr;
            return "🔀 Shuffled queue.";
        },
        setRepeat(type) {
            if (type == "playlist") {
                this.repeat = "playlist";
                return "🔁 Repeat turned on for the current queue.";
            } else if (type == "song") {
                this.repeat = "song";
                return "🔂 Repeat turned on for this song.";
            } else if (type == "off") {
                this.repeat = null;
                return "✅ Repeat turned off.";
            } else {
                return "❌ Please pick either `playlist`, `song` or `off`.";
            }
        }
    })
}

// bot.on("voiceStateUpdate", (oldState, newState) => {
//     if (bot.player.has(newState.guild.id)) {
//         let player = bot.player.get(newState.guild.id);
//         if (player.voiceChannel) {
//             if (player.voiceChannel.members.length > 0) {
//                 player.resume();
//             } else {
//                 player.pause();
//             }
//         }
//     }
// })

bot.secondsToString = (time) => {
    var sec_num = parseInt(time, 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    if (hours !== "00") {
        return hours+':'+minutes+':'+seconds;
    } else {
        return minutes+':'+seconds;
    }
}

bot.ws.on('INTERACTION_CREATE', interaction => {
    if (interaction.data.component_type === 2) {
        let player = bot.player.get(interaction.guild_id);
        if (interaction.message.id == player.nowPlayingMessage.id) {
            if (interaction.data.custom_id == "play") {
                player.resume();
                bot.handleInteraction(interaction)
            } else if (interaction.data.custom_id == "playpause") {
                if (player.playing) {
                    player.pause();
                } else {
                    player.resume();
                }
                bot.handleInteraction(interaction)
            } else if (interaction.data.custom_id == "stop") {
                player.stop();
                bot.handleInteraction(interaction)
            } else if (interaction.data.custom_id == "shuffle") {
                player.shuffle();
                bot.handleInteraction(interaction)
            } else if (interaction.data.custom_id == "skip") {
                player.skip();
                bot.handleInteraction(interaction)
            } else if (interaction.data.custom_id == "repeat") {
                if (player.repeat == null) {
                    player.repeat = "playlist"
                    bot.handleInteraction(interaction)
                } else if (player.repeat == "playlist") {
                    player.repeat = "song"
                    bot.handleInteraction(interaction)
                } else {
                    player.repeat = null
                    bot.handleInteraction(interaction)
                }
            } 
            player.updatePlayer()
        } else {
            bot.handleInteraction(interaction, "❌ The button you pressed is from a destroyed or broken player.")
        }
    }
})

bot.login(config.token);