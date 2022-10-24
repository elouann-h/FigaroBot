const { Client, ActivityType } = require("discord.js");
require("dotenv").config();
const LoadCommands = require("./functions/LoadCommands");
const Commands = require("./json/Commands");

const susbot = new Client({ intents: 32771 });

if (process.env.REGISTER === "1") void LoadCommands(susbot, Commands);

susbot.on("ready", () => {
    console.log("Bot is ready!");
    let statusIndex = 0;
    setInterval(() => {
        const activities = [
            { name: "Maelys a un plus gros zizi que Noe", type: ActivityType.Playing },
            { name: "Je suis un skatos gay tah Timeo", type: ActivityType.Playing },
        ];
        susbot.user.setPresence({
            activities: [activities[statusIndex]],
            status: "online",
        });
        statusIndex += (statusIndex === (activities.length - 1) ? -statusIndex : 1);
    }, 15_000);
});

susbot.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === "questionnaire") void await interaction.reply("Test");
    }
});

void susbot.login(process.env.TOKEN);