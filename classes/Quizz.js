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

        if (data.finished) {
            actualMomentEmbed
                .setColor(this.client.colors.success)
                .setTitle("✅ » Cette partie est terminée.");
        }
        else if (data.historic.length === 0) {
            actualMomentEmbed
                .setColor(this.client.colors.error)
                .setTitle("**⏳ » Cette partie n'a pas encore démarré.**");
            if (Object.keys(data.players).length < 3) actualMomentEmbed.setDescription("> Il faut au moins 3 joueurs pour commencer une partie.");
            else actualMomentEmbed.setDescription("> En attente du chef de partie pour démarrer la partie...");
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