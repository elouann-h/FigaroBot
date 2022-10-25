const { Routes, REST } = require("discord.js");
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

module.exports = async (client) => {
    try {
        console.log("Started refreshing application (/) commands.");

        await rest.put(Routes.applicationCommands(client.user.id), { body: client.enums.Commands });

        console.log("Successfully reloaded application (/) commands.");
    }
    catch (error) {
        console.error(error);
    }
};