process.env = Object.assign(process.env, require(process.env.NODE_ENV !== 'production' ? './config.json' : '/etc/secrets/config.json'));

const { Client, GatewayIntentBits } = require('discord.js');

const { instance } = require('./services/ec2');
const { generateEmbed, sendButtons } = require('./services/utils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
}),
    colors = {
        stopped: 0xed4245,
        pending: 0xe67e22,
        stopping: 0xe67e22,
        running: 0x57f287,
        terminated: 0x2c2f33
    };

client.once('ready', async () => {
    const channel = client.channels.cache.get(process.env.CHANNEL_ID);
    await sendButtons(channel);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const isRefresh = interaction.customId === 'refresh-status';
    const currentStatus = await instance.status();
    const isRunning = currentStatus === 'running';
    let canStart = !isRefresh && process.env.DISABLED == 'false';

    if (canStart) {
        if (!await instance.start()) {
            const now = new Date();
            await interaction.user.send(`You can't start the server right now! _${now.toISOString()}_`);
            canStart = false;
        }
    };

    const color = colors[canStart ? 'pending' : currentStatus];

    // Update Buttons
    await sendButtons(interaction.channel, canStart);

    // Update Discord Embed
    interaction.channel.send({
        embeds: [
            generateEmbed(
                color,
                interaction.member.displayName,
                await instance.ip()
            )
        ]
    });
    await interaction.channel.send({ content: "**Please don't click 'Start Server' for no reason!**" });

});

client.login(process.env.BOT_TOKEN);