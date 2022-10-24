const { Client } = require("discord.js");
require("dotenv").config();
const LoadCommands = require("./functions/LoadCommands");
const Commands = require("./json/Commands");

const susbot = new Client({ intents: 32771 });

if (process.env.REGISTER === "1") void LoadCommands(susbot, Commands);

void susbot.login(process.env.TOKEN);