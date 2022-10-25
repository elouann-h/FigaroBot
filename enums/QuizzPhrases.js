module.exports = {
    dares: [
        "%P1 laisse accès libre à ton Instagram à %P2 pendant 30 secondes.",
        "%P1 envoi un message à ton/ta crush lui demandant si il/elle sait où se trouve le clitoris.",
        "%P1 insulte la personne de ton choix pendant 10 secondes.",
        "%P1 chante-nous une chanson de ton choix avec quelque chose dans la bouche.",
        "%P1 appelle la personne de ton choix et avoue-lui tes sentiments devant tout le monde.",
    ],
    truths: [
        "%P1 avec qui pourrais-tu le plus coucher dans ce groupe ?",
        "%P1 qui devrait niquer sa mère ?",
        "%P1 quel est ton plus gros dossier ?",
        "%P1 quel est le plus gros dossier que tu connaisses sur %P2 ?",
        "%P1 révèle un secret sur %P2 dont il/elle a honte ?",
    ],
    votes: [
        "Qui est le plus égoïste entre %P1 et %P2 ?",
        "Qui est le plus jaloux entre %P1 et %P2 ?",
        "Qui a la plus grosse entre %P1 et %P2 ?",
        "Qui aime le plus les pieds ici entre %P1 et %P2 ?",
        "Qui est le/la plus moche entre %P1 et %P2 ?",
        "Qui est le/la plus belle entre %P1 et %P2 ?",
        "Qui serait le plus susceptible de trahir entre %P1 et %P2 ?",
        "Qui est le plus gros charo entre %P1 et %P2 ?",
    ],
    getRandom(type = "all") {
        if (type === "all") {
            const types = ["dares", "truths", "votes"];
            type = types[Math.floor(Math.random() * types.length)];
        }
        return { type, value: this[type][Math.floor(Math.random() * this[type].length)] };
    },
};