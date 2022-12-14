require("dotenv").config();
const { Client,
    ActivityType,
    EmbedBuilder,
    ModalSubmitInteraction,
} = require("discord.js");
const index = require("./index");

const client = new (class extends Client {
    constructor() {
        super({ intents: 33539 });
        Object.assign(this, index);

        this.token = require("./token.json").token;

        this.quizz = new this.classes.Quizz(this);
        this.colors = {
            simple: 0x303136,
            success: 0x43b581,
            error: 0xf04747,
            question: 0x7289da,
        };
    }
});

client.on("ready", () => {
    console.log("Bot is ready!");
    let statusIndex = 0;
    setInterval(() => {
        const activities = [
            { name: "Coucou", type: ActivityType.Playing },
        ];
        client.user.setPresence({
            activities: [activities[statusIndex]],
            status: "online",
        });
        statusIndex += (statusIndex === (activities.length - 1) ? -statusIndex : 1);
    }, 15_000);
});

client.on("interactionCreate", async interaction => {
    if (process.env.TEST_MODE === "1" && interaction.user.id !== "539842701592494111") return;
    if (interaction.isCommand()) {
        if (interaction.commandName === "quizz") {
            if (interaction.member.roles.cache.find(r => r.name.includes("QuizzMan"))) {
                if (!client.quizz.gameExists(interaction.guild.id)) {
                    const message = await interaction.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`:mirror_ball: » **${interaction.user.username}**, création de la partie...`)
                                .setColor(client.colors.simple)
                                .toJSON(),
                        ],
                    });

                    const ownerData = { id: interaction.user.id, nickname: interaction.user.username };
                    const modalSubmit = await client.classes.Quizz.addPlayerModal(client, interaction, "Créer un Quizz !");

                    if (modalSubmit instanceof ModalSubmitInteraction) {
                        const modalFields = modalSubmit.fields.fields;
                        ownerData["nickname"] = modalFields.get("playerNickname").value;
                    }

                    client.quizz.create(ownerData, interaction.guild.id);
                    client.quizz.setMessage(interaction.guild.id, message);
                    await client.quizz.refresh(interaction.guild.id);
                }
                else {
                    await interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`:mirror_ball: » **${interaction.user.username}**, récupération de la partie existante...`)
                                .setColor(client.colors.simple)
                                .toJSON(),
                        ],
                    }).catch(client.functions.NullFunction);

                    await client.quizz.resend(interaction.guild.id, await interaction.fetchReply());
                }
            }
            else {
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setDescription(`:mirror_ball: » **${interaction.user.username}**, pour lancer une partie, vous devez avoir un rôle nommé **\`QuizzMan\`** !`)
                            .setColor(client.colors.error)
                            .toJSON(),
                    ],
                }).catch(client.functions.NullFunction);
            }
        }
        else if (interaction.commandName === "delete-guild-quizz") {
            if (interaction.member.permissions.has("Administrator")) {
                if (client.quizz.gameExists(interaction.guild.id)) {
                    client.quizz.delete(interaction.guild.id);
                    await client.quizz.getMessage(interaction.guild.id).delete().catch(client.functions.NullFunction);
                    await interaction.channel.send(":wave: **Le Quizz a été supprimé par un administrateur.**").catch(client.functions.NullFunction);
                }
                else {
                    await interaction.reply(":x: **Il n'y a aucun Quizz sur ce serveur.**").catch(client.functions.NullFunction);
                }
            }
        }
    }
    else if (interaction.isButton()) {
        if (interaction.customId.startsWith("question")) {
            try {
                await interaction.message.delete().catch(client.functions.NullFunction);
            }
            catch (err) { return null; }
        }
        else if (interaction.customId.startsWith("quizz")) {
            const [action, quizzId] = interaction.customId.split("_").splice(1);
            if (!client.quizz.gameExists(quizzId)) return interaction.reply({ content: ":x: **La partie n'existe pas.**", ephemeral: true });

            const game = client.quizz.get(quizzId);

            if (action === "generateQuestion") {
                if (game.owner.id !== interaction.user.id) {
                    interaction.reply({
                        content: ":x: **Vous n'êtes pas le propriétaire de la partie.**",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
                else if (Math.random() < 0.7) {
                    await client.quizz.generateQuestion(quizzId, interaction);
                }
                else {
                    await client.quizz.generateVote(quizzId, interaction);
                }
            }
            else if (action === "startGame") {
                if (game.owner.id !== interaction.user.id) {
                    await interaction.reply({
                        content: ":x: **Vous n'êtes pas le chef de la partie.**",
                        ephemeral: true,
                    });
                }
                else if (Object.keys(game.players).length < client.quizz.playersMin) {
                    await interaction.reply({
                        content: `:x: **Il faut au moins ${client.quizz.playersMin} joueurs pour commencer la partie.**`,
                        ephemeral: true,
                    });
                }
                else {
                    await interaction.deferUpdate().catch(client.functions.NullFunction);
                    client.quizz.start(interaction.guild.id);
                    await interaction.channel.send({
                        content: ":white_check_mark: **La partie a commencé !**",
                    });
                    await client.quizz.refresh(quizzId);
                }
            }
            else if (action === "deleteGame") {
                const owner = game.owner;
                client.quizz.delete(quizzId);
                await interaction.message.delete().catch(client.functions.NullFunction);
                await interaction.channel.send(`:wave: **Le Quizz a été supprimé.** (${owner.nickname})`).catch(client.functions.NullFunction);
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
                    const modalSubmit = await client.classes.Quizz.addPlayerModal(client, interaction, "Rejoindre le Quizz !");

                    if (modalSubmit instanceof ModalSubmitInteraction) {
                        const modalFields = modalSubmit.fields.fields;
                        playerData["nickname"] = modalFields.get("playerNickname").value;
                    }

                    client.quizz.addPlayer(interaction.guild.id, playerData);
                    await client.quizz.refresh(interaction.guild.id);
                    await interaction.channel.send({
                        content: `:white_check_mark: **${playerData.nickname} (${interaction.user.username}) a rejoint la partie.**`,
                    }).catch(client.functions.NullFunction);
                }
            }
            else if (action === "leaveGame") {
                if (interaction.user.id === game.owner.id) {
                    await interaction.reply({
                        content: ":x: **Vous êtes le chef de cette partie, vous ne pouvez que la supprimer.**",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
                else if (interaction.user.id in game.players) {
                    client.quizz.removePlayer(interaction.guild.id, interaction.user.id);
                    await client.quizz.refresh(interaction.guild.id);
                    await interaction.channel.send({
                        content: `:white_check_mark: **${interaction.user.username} a quitté la partie.**`,
                    }).catch(client.functions.NullFunction);
                }
                else {
                    await interaction.reply({
                        content: ":x: **Vous n'êtes pas dans cette partie.**",
                        ephemeral: true,
                    }).catch(client.functions.NullFunction);
                }
            }
        }
    }
});

void client.login(client.token).then(async () => {
    if (process.env.REGISTER === "1") void await client.functions.LoadCommands(client);
});