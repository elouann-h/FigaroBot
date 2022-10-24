require("dotenv").config();
const Discord = require("discord.js");
const { REST, Routes } = require("discord.js");

const Susbot = new Discord.Client({ intents: 32771 });

const commands = [
    {
        name: "questionnaire",
        description: "Créer une partie de Vakarm...",
    },
    {
        name: "roue-des-problemes",
        description: "Créer une roue avec des défis, des questions et des dossiers...",
    },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

if (process.env.REGISTER === "1") {
    (async () => {
        try {
            console.log("Started refreshing application (/) commands.");

            await rest.put(Routes.applicationCommands("1033846760210169967"), { body: commands });

            console.log("Successfully reloaded application (/) commands.");
        } catch (error) {
            console.error(error);
        }
    })();
}

console.log("test");

Susbot.login(process.env.TOKEN);