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
    }

    async refresh(quizzId) {
        const message = this.getMessage(quizzId);
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
            finished: false,
            message: null,
            channel: null,
            guild: quizzId,
        });
        return quizzId;
    }

    /**
     * Returns this data model:
     * quizzIz, owner, players, historic, finished, message, channel, guild
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

    embed(quizzId) {
        const data = this.quizzDb.get(quizzId);
        return new EmbedBuilder()
            .setColor(0xFFFFAA)
            .setTitle(`Quizz - Partie du ${data.date.toLocaleString("fr-FR")}`)
            .setDescription(`Owner de la partie: ${data.owner.name}`)
            .addFields(
                {
                    name: "Joueurs",
                    value: Object.values(data.players).map(player => player.nickname).join(", "),
                },
            );
    }

    messagePayload(quizzId) {
        const data = this.quizzDb.get(quizzId);

        const embeds = [this.embed(quizzId).toJSON()];
        const components = [];

        const actualMomentEmbed = new EmbedBuilder()
            .setColor(0xFFFFAA);

        if (data.finished) {
            actualMomentEmbed.setTitle("Cette partie est terminée.");
        }
        else if (data.historic.length === 0) {
            actualMomentEmbed.setTitle("Cette partie n'a pas encore commencé.");
            if (Object.keys(data.players).length < 3) actualMomentEmbed.setDescription("Il faut au moins 3 joueurs pour commencer une partie.");
            components.push(
                new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setLabel("Commencer")
                            .setEmoji("✔️")
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(`quizz_startGame_${data.quizzId}`)
                            .setDisabled(Object.keys(data.players).length < 3),
                        new ButtonBuilder()
                            .setLabel("Supprimer")
                            .setEmoji("🔚")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`quizz_deleteGame_${data.quizzId}`),
                    ),
                new ActionRowBuilder()
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
                    ),
            );
        }

        embeds.push(actualMomentEmbed.toJSON());

        return {
            content: "", embeds, components,
        };
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
        console.log(interaction);
        await interaction.deferUpdate();
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