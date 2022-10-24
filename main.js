require("dotenv").config();
const { Client, ActivityType } = require("discord.js");
const Enmap = require("enmap");
const index = require("./index");

const client = new Client({ intents: 32771 });
client.index = index;
client.db = {
    questionnaires: new Enmap({ name: "questionnaires" }),
};

if (process.env.REGISTER === "1") void client.index.functions.LoadCommands(client);

client.on("ready", () => {
    console.log("Bot is ready!");
    let statusIndex = 0;
    setInterval(() => {
        const activities = [
            { name: "Maelys a un plus gros zizi que Noe", type: ActivityType.Playing },
            { name: "Je suis un skatos gay tah Timeo", type: ActivityType.Playing },
        ];
        client.user.setPresence({
            activities: [activities[statusIndex]],
            status: "online",
        });
        statusIndex += (statusIndex === (activities.length - 1) ? -statusIndex : 1);
    }, 15_000);
});

client.on("interactionCreate", async interaction => {
    if (interaction.isCommand()) {
        if (interaction.commandName === "questionnaire") void await interaction.reply("Test");
    }
});

void client.login(process.env.TOKEN);