module.exports = {
    name: 'help',
    description: 'Get bot commands.',
    aliases: ['h'],
    execute(msg, args, bot) {
        const Discord = require('discord.js');
        const fs = require('fs');

        const config = JSON.parse(fs.readFileSync("config.json"));

        const embed = new Discord.MessageEmbed()
        .setTitle("Jester Bot Help")
        .setColor("#2F3136")
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            if (msg.guild.member(msg.author).hasPermission(this.permission) || !command.permission) {
                const command = require(`../commands/${file}`);
                if (command.aliases) {
                    embed.addField(config.prefix+command.name, command.description + "\nAliases: " + command.aliases.map(a => `\`${config.prefix}${a}\` `).join(", "))
                } else {
                    embed.addField(config.prefix+command.name, command.description)
                }
            }
        }

        msg.author.send(embed);
        msg.react("✅")
	},
};