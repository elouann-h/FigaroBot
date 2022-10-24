require("dotenv").config();
const { Client,
    ActivityType,
    EmbedBuilder,
    ActionRowBuilder,
    ModalBuilder,
    ButtonBuilder,
    TextInputStyle,
    TextInputBuilder,
    ModalSubmitInteraction,
} = require("discord.js");
const Enmap = require("enmap");
const index = require("./index");

const client = new (class extends Client {
    constructor() {
        super({ intents: 32771 });
        Object.assign(this, index);

        this.db = {
            quizz: new Enmap({ name: "quizz" }),
        };
    }
});

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
        if (interaction.commandName === "questionnaire") {
            const gameExists = client.classes.Quizz.getGame(client, interaction.guild.id) instanceof client.classes.Quizz;
            let game = null;
            const message = await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${interaction.user.username}, création de la partie...`)
                        .setColor(0xFFFFAA)
                        .toJSON(),
                ],
            });

            if (!gameExists) {
                const ownerData = { name: "TiméoSkatos", gender: "M", id: interaction.user.id };
                const modalSubmit = await client.classes.Quizz.addPlayerModal(client, interaction, "Créer un Quizz !");

                if (modalSubmit instanceof ModalSubmitInteraction) {
                    const modalFields = modalSubmit.fields.fields;
                    ownerData["name"] = modalFields.get("playerName").value;
                    ownerData["gender"] = modalFields.get("playerGender").value;
                }

                game = new client.classes.Quizz(client, interaction.guild.id, ownerData);
            }
            else {
                game = client.classes.Quizz.getGame(client, interaction.guild.id);
            }

            await game.refresh(message);
        }
    }
    else if (interaction.isButton()) {
        if (interaction.customId.startsWith("quizz")) {
            const [action, gameId] = interaction.customId.split("_").splice(1);
            const game = client.classes.Quizz.getGame(client, gameId);

            if (!(game instanceof client.classes.Quizz)) return interaction.reply({ content: ":x: **La partie n'existe pas.**", ephemeral: true });

            if (action === "startGame") {

            }
            else if (action === "deleteGame") {
                const owner = game.owner;
                client.db.quizz.delete(gameId);
                await interaction.message.delete().catch(client.functions.NullFunction);
                await interaction.channel.send(`:wave: **Le Quizz a été supprimé.** (${owner.name})`).catch(client.functions.NullFunction);
            }
            else if (action === "joinGame") {
                if (game.players.length >= 10) {
                    await interaction.reply({
                        content: ":x: **Le Quizz est complet.** (10/10)",
                        ephemeral: true,
                    });
                }
                else if (game.owner.id === interaction.user.id) {
                    await interaction.reply({
                        content: ":x: **Vous êtes le chef de cette partie.**",
                        ephemeral: true,
                    });
                }
                else if (interaction.user.id in game.players) {
                    await interaction.reply({
                        content: ":x: **Vous êtes déjà dans cette partie.**",
                        ephemeral: true,
                    });
                }
                else {
                    const playerData = { name: "Maechien", gender: "M", id: interaction.user.id };
                    const modalSubmit = client.classes.Quizz.addPlayerModal(client, interaction, "Rejoindre le Quizz !");

                    if (modalSubmit instanceof ModalSubmitInteraction) {
                        const modalFields = modalSubmit.fields.fields;
                        playerData["name"] = modalFields.get("playerName").value;
                        playerData["gender"] = modalFields.get("playerGender").value;
                    }

                    game.addPlayer(playerData);
                    await game.refresh();
                }
            }
        }
    }
});

void client.login(process.env.TOKEN);