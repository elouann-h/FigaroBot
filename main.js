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

        this.quizz = new this.classes.Quizz(this);
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
            const message = await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${interaction.user.username}, création de la partie...`)
                        .setColor(0xFFFFAA)
                        .toJSON(),
                ],
            });

            if (!client.quizz.gameExists(interaction.guild.id)) {
                const ownerData = { id: interaction.user.id, nickname: interaction.user.username };
                const modalSubmit = await client.classes.Quizz.addPlayerModal(client, interaction, "Créer un Quizz !");

                if (modalSubmit instanceof ModalSubmitInteraction) {
                    const modalFields = modalSubmit.fields.fields;
                    ownerData["nickname"] = modalFields.get("playerNickname").value;
                }

                client.quizz.create(ownerData, interaction.guild.id);
            }

            client.quizz.setMessage(interaction.guild.id, message);
            await client.quizz.refresh(interaction.guild.id);
        }
    }
    else if (interaction.isButton()) {
        console.log(interaction.customId);
        if (interaction.customId.startsWith("quizz")) {
            const [action, quizzId] = interaction.customId.split("_").splice(1);
            if (!client.quizz.gameExists(quizzId)) return interaction.reply({ content: ":x: **La partie n'existe pas.**", ephemeral: true });

            const game = client.quizz.get(quizzId);

            if (action === "startGame") {

            }
            else if (action === "deleteGame") {
                const owner = game.owner;
                client.quizz.delete(quizzId);
                await interaction.message.delete().catch(client.functions.NullFunction);
                await interaction.channel.send(`:wave: **Le Quizz a été supprimé.** (${owner.name})`).catch(client.functions.NullFunction);
            }
            else if (action === "joinGame") {
                if (game.players.length >= 10) {
                    await interaction.reply({
                        content: ":x: **Le Quizz est complet.** (10/10)",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
                else if (game.owner.id === interaction.user.id) {
                    await interaction.reply({
                        content: ":x: **Vous êtes le chef de cette partie.**",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
                else if (interaction.user.id in game.players) {
                    await interaction.reply({
                        content: ":x: **Vous êtes déjà dans cette partie.**",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
                else {
                    const playerData = { id: interaction.user.id, nickname: interaction.user.username };
                    const modalSubmit = client.classes.Quizz.addPlayerModal(client, interaction, "Rejoindre le Quizz !");

                    if (modalSubmit instanceof ModalSubmitInteraction) {
                        const modalFields = modalSubmit.fields.fields;
                        playerData["nickname"] = modalFields.get("playerNickname").value;
                    }

                    client.quizz.addPlayer(interaction.guild.id, playerData);
                    await client.quizz.refresh(interaction.guild.id);
                    await interaction.followUp({
                        content: `:white_check_mark: **${playerData.nickname} (${interaction.user.username}) a rejoint la partie.**`,
                    }).catch(client.functions.NullFunction);
                }
            }
        }
    }
});

void client.login(process.env.TOKEN);