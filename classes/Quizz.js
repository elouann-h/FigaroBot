const {
    ButtonBuilder,
    EmbedBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonStyle,
} = require("discord.js");
const Enmap = require("enmap");

class Quizz {
    constructor(client) {
        this.client = client;
        this.quizzDb = new Enmap({ name: "quizz" });
        this.playersMin = 3;
    }

    async refresh(quizzId) {
        const message = await this.getMessage(quizzId);
        try {
            if (message) message.edit(this.messagePayload(quizzId)).catch(this.client.functions.NullFunction);
        }
        catch {
            this.client.channels.cache.get(this.quizzDb.get(quizzId).channel)
                ?.send(this.messagePayload(quizzId))
                ?.catch(this.client.functions.NullFunction);
        }
        return this;
    }

    async resend(quizzId, newMsg) {
        const message = await this.getMessage(quizzId);
        try {
            if (message) message.delete().catch(this.client.functions.NullFunction);
        }
        catch (err) { void err; }

        await this.setMessage(quizzId, newMsg);
        await this.refresh(quizzId);

        return this;
    }

    gameExists(quizzId) {
        return this.quizzDb.has(quizzId);
    }

    create(ownerData, quizzId) {
        this.quizzDb.set(quizzId, {
            quizzId,
            date: new Date(),
            owner: ownerData,
            players: { [ownerData.id]: ownerData },
            historic: [],
            state: "waiting",
            message: null,
            channel: null,
            guild: quizzId,
        });
        return quizzId;
    }

    /**
     * Returns this data model:
     * quizzIz, owner, players, historic, state, message, channel, guild
     */
    get(quizzId) {
        return this.quizzDb.get(quizzId);
    }

    setMessage(quizzId, message) {
        this.quizzDb.set(
            quizzId,
            message.id, "message",
        );
        this.quizzDb.set(
            quizzId,
            message.channel.id,
            "channel",
        );
        this.quizzDb.set(
            quizzId,
            message.guild.id,
            "guild",
        );
        return this;
    }

    getMessage(quizzId) {
        const data = this.quizzDb.get(quizzId);

        const guild = this.client.guilds.cache.get(data.guild);
        const channel = guild.channels.cache.get(data.channel);
        try {
            return channel.messages.fetch(data.message);
        }
        catch {
            return null;
        }
    }

    getPlayer(playerId) {
        return this.client.users.cache.get(playerId)?.username ?? playerId;
    }

    embed(quizzId) {
        const data = this.quizzDb.get(quizzId);
        return new EmbedBuilder()
            .setColor(this.client.colors.simple)
            .setTitle("🍕 » Quizz !")
            .setThumbnail("https://cdn.discordapp.com/attachments/1034027575917416448/1034389514128465960/question.png")
            .setDescription("*Le but du jeu est de répondre à des questions qui seront posées. Certaines sont anonymes, d'autres non... :smirk:*")
            .addFields(
                {
                    name: `\u200b\n> Liste des joueurs (**${Object.keys(data.players).length}**/10)`,
                    value: "\u200b\n" + Object.values(data.players).map(player =>
                        `**${player.nickname}** (${this.getPlayer(player.id)})`,
                    ).join("\n"),
                },
            )
            .setFooter({ text: `ID: ${data.quizzId}` })
            .setTimestamp(data.date);
    }

    messagePayload(quizzId) {
        const data = this.quizzDb.get(quizzId);

        const embeds = [this.embed(quizzId).toJSON()];
        const components = [];

        const actualMomentEmbed = new EmbedBuilder();
        const joinLeaveGameRow = new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setLabel("Rejoindre")
                        .setEmoji("✖️")
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`quizz_joinGame_${data.quizzId}`)
                        .setDisabled(Object.keys(data.players).length >= 10),
                    new ButtonBuilder()
                        .setLabel("Quitter")
                        .setEmoji("➖")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`quizz_leaveGame_${data.quizzId}`),
                );

        if (data.state === "finished") {
            actualMomentEmbed
                .setColor(this.client.colors.success)
                .setTitle("✅ » Cette partie est terminée.");

            this.delete(quizzId);
        }
        else if (data.state === "waiting") {
            actualMomentEmbed
                .setColor(this.client.colors.error)
                .setTitle("**⏳ » Cette partie n'a pas encore démarré.**");
            if (Object.keys(data.players).length < this.playersMin) actualMomentEmbed.setDescription("> Il faut au moins this.playersMin joueurs pour commencer une partie.");
            else actualMomentEmbed.setDescription("> En attente du chef de partie pour démarrer la partie...");
            components.push(
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel("Commencer")
                            .setEmoji("✔️")
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(`quizz_startGame_${data.quizzId}`)
                            .setDisabled(Object.keys(data.players).length < this.playersMin),
                        new ButtonBuilder()
                            .setLabel("Supprimer")
                            .setEmoji("🔚")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`quizz_deleteGame_${data.quizzId}`),
                    ),
                joinLeaveGameRow,
            );
        }
        else if (data.state === "playing") {
            actualMomentEmbed
                .setColor(this.client.colors.simple)
                .setTitle("🎮 » Cette partie est en cours.");

            components.push(
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel("Générer une question")
                            .setEmoji("🎲")
                            .setStyle(ButtonStyle.Success)
                            .setCustomId(`quizz_generateQuestion_${data.quizzId}`),
                        new ButtonBuilder()
                            .setLabel("Supprimer")
                            .setEmoji("🔚")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`quizz_deleteGame_${data.quizzId}`),
                    ),
                joinLeaveGameRow,
            );
        }

        embeds.push(actualMomentEmbed.toJSON());

        return {
            content: "", embeds, components,
        };
    }

    async generateQuestion(quizzId, interaction) {
        const data = this.quizzDb.get(quizzId);
        const question = this.client.enums.QuizzPhrases.getRandom(["truths", "dares"][Math.floor(Math.random() * 2)]);
        const [firstPlayer, secondPlayer] = this.generateRandomPlayers(Object.values(data.players), 2);
        const pageTitle = question.type === "truths" ? `__Vérité__ pour ***${firstPlayer.nickname}*** !` : `__Défi__ pour ***${firstPlayer.nickname}*** !`;

        const embeds = [
            new EmbedBuilder()
                .setColor(this.client.colors.question)
                .setTitle(`🧨 » ${pageTitle}`)
                .setDescription(question.value.replace("%P1", `***${firstPlayer.nickname}***`).replace("%P2", `***${secondPlayer.nickname}***`)),
        ];
        const components = [
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setLabel("Effacer")
                        .setEmoji("🗑️")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("question_deletePopup"),
                ),
        ];
        const messagePayload = {
            embeds, components,
        };

        if (!interaction.replied) {
            await interaction.reply(messagePayload).catch(this.client.functions.NullFunction);
        }
        else {
            await interaction.editReply(messagePayload).catch(this.client.functions.NullFunction);
        }
    }

    async generateVote(quizzId, interaction) {
        const data = this.quizzDb.get(quizzId);
        const question = this.client.enums.QuizzPhrases.getRandom("votes");
        const [firstPlayer, secondPlayer] = this.generateRandomPlayers(Object.values(data.players), 2);
        const pageTitle = "🪁 » C'est l'heure du __Vote__ !";

        const embedStr = (votesLength) => {
            return "```Votez pour la personne de votre choix ! Soyez honnête. Vous ne pouvez qu'une seule fois, et vous ne pouvez pas revenir sur votre décision. Réfléchissez bien !```\n__Question :__\n> "
            +
            question.value.replace("%P1", `***${firstPlayer.nickname}***`).replace("%P2", `***${secondPlayer.nickname}***`)
            +
            `\n\n🤿 : ${firstPlayer.nickname}\n🪗 : ${secondPlayer.nickname}\n\nÉtat des votes: **${votesLength}**/${Object.values(data.players).length} *(Vous avez **30** secondes pour voter !)*`;
        };

        const embeds = [
            new EmbedBuilder()
                .setColor(this.client.colors.question)
                .setTitle(`${pageTitle}`)
                .setDescription(embedStr(0)),
        ];
        const components = [
            new ActionRowBuilder()
                .setComponents(
                    new ButtonBuilder()
                        .setLabel(firstPlayer.nickname)
                        .setEmoji("🤿")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("vote_firstChoice"),
                    new ButtonBuilder()
                        .setLabel(secondPlayer.nickname)
                        .setEmoji("🪗")
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId("vote_secondChoice"),
                    new ButtonBuilder()
                        .setLabel("Terminer vote")
                        .setEmoji("📩")
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId("vote_endVote"),
                ),
        ];
        const messagePayload = {
            embeds, components,
        };

        const votes = [];
        const anonymousOrNot = Math.random() < 0.7;
        const message = await interaction.channel.send(messagePayload);

        const collector = message.createMessageComponentCollector({
            filter: (inter) => inter.user.id in data.players,
            time: 30_000,
        });
        collector.on("collect", async i => {
            if (i.customId !== "vote_endVote") {
                if (votes.map(e => e.id).includes(i.user.id)) {
                    await i.reply({
                        content: ":x: **Vous avez déjà voté une fois !**",
                        ephemeral: true,
                    }).catch(this.client.functions.NullFunction);
                }
                else {
                    let content = ":shushing_face: C'est l'heure des révélations ! **Ce vote est anonyme**.";
                    if (!anonymousOrNot) content = "🥶 C'est l'heure des révélations ! **Les résultats de ce vote seront publics**.";

                    votes.push({ id: i.user.id, choice: i.customId });

                    await i.reply({
                        content: content + "\n*Attendez que tout le monde ait voté ou que le chef de partie affiche les résultats...*",
                        ephemeral: true,
                    }).catch(this.client.functions.NullFunction);

                    await message.edit({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(this.client.colors.question)
                                .setTitle(`${pageTitle}`)
                                .setDescription(embedStr(votes.length)),
                        ],
                    }).catch(this.client.functions.NullFunction);

                    if (votes.length >= Object.values(data.players).length) {
                        await i.channel.send({
                            content: "Tous les votes sont effectués !",
                        }).catch(this.client.functions.NullFunction);
                    }
                }
            }
            else if (i.user.id === data.owner.id) {
                collector.stop();
            }
            else {
                await i.reply({
                    content: ":x: **Vous devez être le chef de la partie pour arrêter le vote.**",
                    ephemeral: true,
                }).catch(this.client.functions.NullFunction);
            }
        });
        collector.on("end", async () => {
            const results = {
                [firstPlayer.nickname]: {
                    votes: votes.filter(v => v.choice === "vote_firstChoice"),
                    amount: 0,
                    percent: 0,
                },
                [secondPlayer.nickname]: {
                    votes: votes.filter(v => v.choice === "vote_secondChoice"),
                    amount: 0,
                    percent: 0,
                },
            };
            results[firstPlayer.nickname].amount = results[firstPlayer.nickname].votes.length;
            results[firstPlayer.nickname].percent = Math.floor(100 * results[firstPlayer.nickname].amount / votes.length);
            results[firstPlayer.nickname].votesString = anonymousOrNot ?
                "Ce vote est anonyme."
                : (results[firstPlayer.nickname].amount > 0 ?
                        results[firstPlayer.nickname].votes.map(e => `***${data.players[e.id].nickname}***`).join(", ")
                        : "Aucun vote."
                );
            results[secondPlayer.nickname].amount = results[secondPlayer.nickname].votes.length;
            results[secondPlayer.nickname].percent = Math.floor(100 * results[secondPlayer.nickname].amount / votes.length);
            results[secondPlayer.nickname].votesString = anonymousOrNot ?
                "Ce vote est anonyme."
                : (results[secondPlayer.nickname].amount > 0 ?
                    results[secondPlayer.nickname].votes.map(e => `***${data.players[e.id].nickname}***`).join(", ")
                    : "Aucun vote."
                );


            const newMessagePayload = {
                embeds: [
                    new EmbedBuilder()
                        .setColor(this.client.colors.question)
                        .setTitle("🪁 » C'est l'heure du __Vote__ !")
                        .setDescription("Voici les résultats du vote !")
                        .addFields(
                            {
                                name: `🤿 » ${firstPlayer.nickname}`,
                                value: `**\`${results[firstPlayer.nickname].percent}%\`**`
                                    + ` (**${results[firstPlayer.nickname].amount}**/${votes.length})`
                                    + `\n\n__Votes :__ ${results[firstPlayer.nickname].votesString}`,
                                inline: true,
                            },
                            {
                                name: `🪗 » ${secondPlayer.nickname}`,
                                value: `**\`${results[secondPlayer.nickname].percent}%\`**`
                                    + ` (**${results[secondPlayer.nickname].amount}**/${votes.length})`
                                    + `\n\n__Votes :__ ${results[secondPlayer.nickname].votesString}`,
                                inline: true,
                            },
                        ),
                ],
                components: [
                    new ActionRowBuilder()
                        .setComponents(
                            new ButtonBuilder()
                                .setLabel("Effacer")
                                .setEmoji("🗑️")
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId("question_deletePopup"),
                        ),
                ],
            };

            await message.delete().catch(this.client.functions.NullFunction);
            await interaction.channel.send(newMessagePayload).catch(this.client.functions.NullFunction);
        });
    }

    generateRandomPlayers(players, number) {
        const randomPlayers = [];
        for (let i = 0; i < number; i++) {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            if (randomPlayers.includes(randomPlayer)) i--;
            else randomPlayers.push(randomPlayer);
        }
        return randomPlayers;
    }

    start(quizzId) {
        this.quizzDb.set(quizzId, "playing", "state");
        return this;
    }

    addPlayer(quizzId, playerData) {
        this.quizzDb.set(
            quizzId,
            { id: playerData.id, nickname: playerData.nickname },
            `players.${playerData.id}`,
        );
        return this;
    }

    removePlayer(quizzId, playerId) {
        this.quizzDb.delete(quizzId, `players.${playerId}`);
        return this;
    }

    delete(quizzId) {
        this.quizzDb.delete(quizzId);
        return this;
    }

    static async addPlayerModal(client, interaction, modalTitle) {
        const modal = new ModalBuilder()
            .setTitle(modalTitle)
            .setCustomId("getPlayerInfos")
            .setComponents(
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                        .setLabel("Entre ton surnom")
                        .setPlaceholder("Timeo le skatos...")
                        .setCustomId("playerNickname")
                        .setMinLength(4)
                        .setMaxLength(20)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short),
                ),
            );
        await interaction.showModal(modal).catch(client.functions.NullFunction);
        const modalSubmit = await interaction.awaitModalSubmit({
            filter: modalSubmitted => modalSubmitted.user.id === interaction.user.id,
            time: 60_000,
        }).catch(client.functions.NullFunction);

        modalSubmit?.deferUpdate().catch(client.functions.NullFunction);

        return modalSubmit;
    }
}

module.exports = Quizz;