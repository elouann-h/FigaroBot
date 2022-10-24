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
    constructor(client, gameId, owner) {
        this.finished = false;
        this.historic = [];
        this.client = client;
        this.gameId = gameId;
        this.players = { [owner.id]: owner };
        this.date = new Date();
        this.owner = owner;
        this.message = null;

        this.save();
    }

    async refresh(message = null) {
        if (message !== null) this.message = message;
        if (this.message === null) return;
        await this.message.edit(this.messagePayload);
        return this;
    }

    get embed() {
        return new EmbedBuilder()
            .setColor(0xFFFFAA)
            .setTitle(`Quizz - Partie du ${this.date.toLocaleString("fr-FR")}`)
            .setDescription(`Owner de la partie: ${this.owner.name}`)
            .addFields(
                {
                    name: "Joueurs",
                    value: Object.values(this.players).map(player => player.name).join(", "),
                },
            );
    }

    get messagePayload() {
        const embeds = [this.embed.toJSON()];
        const components = [];

        const actualMomentEmbed = new EmbedBuilder()
            .setColor(0xFFFFAA);

        if (this.finished) {
            actualMomentEmbed.setTitle("Cette partie est terminée.");
        }
        else if (this.historic.length === 0) {
            actualMomentEmbed.setTitle("Cette partie n'a pas encore commencé.");
            if (Object.keys(this.players).length < 3) actualMomentEmbed.setDescription("Il faut au moins 3 joueurs pour commencer une partie.");
            components.push(
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel("Commencer")
                            .setEmoji("✔️")
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(`quizz_startGame_${this.gameId}`)
                            .setDisabled(Object.keys(this.players).length < 3),
                        new ButtonBuilder()
                            .setLabel("Supprimer")
                            .setEmoji("🔚")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`quizz_deleteGame_${this.gameId}`),
                    ),
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel("Rejoindre")
                            .setEmoji("✖️")
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(`quizz_joinGame_${this.gameId}`)
                            .setDisabled(Object.keys(this.players).length >= 10),
                        new ButtonBuilder()
                            .setLabel("Quitter")
                            .setEmoji("➖")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`quizz_leaveGame_${this.gameId}`),
                    ),
            );
        }

        embeds.push(actualMomentEmbed.toJSON());

        return {
            content: "", embeds, components,
        };
    }

    save() {
        const data = {};
        for (const key in this) {
            if (typeof this[key] !== "function") data[key] = this[key];
        }
        this.client.db.quizz.set(this.gameId, data);
        return this;
    }

    addPlayer(name, gender, userId) {
        this.players[name] = {
            name, gender, id: userId, timesPlayed: 0,
        };
        this.save();
        return this;
    }

    removePlayer(name) {
        delete this.players[name];
        this.save();
        return this;
    }

    generateQuestion() {
        if (this.players.length < 3) return null;

        const P1 = this.getRandomPlayer(Object.values(this.players));
        const P2 = this.getRandomPlayer(Object.values(this.players).filter(player => player.name !== P1.name));

        return (
            Math.random <= 0.5 ?
                this.client.enums.QuizzPhrases.getRandomSentence()
                : this.client.enums.QuizzPhrases.getRandomVote()
        ).replace("%P1", P1.name).replace("%P2", P2.name);
    }

    getRandomPlayer(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    static async addPlayerModal(client, interaction, modalTitle) {
        const modal = new ModalBuilder()
            .setTitle(modalTitle)
            .setCustomId("getPlayerInfos")
            .setComponents(
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                        .setLabel("Entre ton nom")
                        .setPlaceholder("Timeo le skatos...")
                        .setCustomId("playerName")
                        .setMinLength(4)
                        .setMaxLength(20)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short),
                ),
                new ActionRowBuilder().setComponents(
                    new TextInputBuilder()
                        .setLabel("Entre ton genre")
                        .setPlaceholder("H/F/A (Homme, Femme, Autre)")
                        .setCustomId("playerGender")
                        .setMaxLength(1)
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

    static load(client, gameData) {
        const gameId = gameData.gameId;
        const owner = gameData.owner;
        const game = new Quizz(client, gameId, owner);
        game.finished = gameData.finished;
        game.historic = gameData.historic;
        game.players = gameData.players;
        game.date = gameData.date;
        game.owner = gameData.owner;
        game.message = gameData.message;

        game.save();
        return game;
    }

    static getGame(client, gameId) {
        const gameData = client.db.quizz.get(gameId);
        if (gameData === "deleted" || gameData === undefined) return null;
        return Quizz.load(client, gameData);
    }
}

module.exports = Quizz;