module.exports = {
    sentences: [
        "%P1 cite 3 défauts de %P2",
        "%P1 cite 3 qualités de %P2",
        "%P1 révèle un secret de fou furieux sur %P2",
        "%P1 avec qui pourrais-tu le plus coucher dans ce groupe ?",
        "%P1 laisse accès libre à ton Instagram à %P2 pendant 30 secondes.",
        "%P1 envoi un message à ton/ta crush lui demandant si il/elle sait où se trouve le clitoris.",
        "%P1 dis-nous qui devrait niquer sa mère.",
        "%P1 insulte la personne de ton choix pendant 10 secondes.",
        "%P1 chante-nous une chanson de ton choix avec quelque chose dans la bouche.",
        "%P1 balance ton plus gros dossier.",
        "%P1 appelle la personne de ton choix et avoue-lui tes sentiments devant tout le monde.",
    ],
    votes: [
        "Qui est le plus égoïste ?",
        "Qui est le plus jaloux ?",
        "Qui a la plus grosse ?",
        "Qui aime le plus les pieds ici ?",
        "Qui est le/la plus moche ?",
        "Qui est le/la plus belle ?",
        "Qui serait le plus susceptible de trahir ?",
        "Qui est le plus gros charo ?"
    ],
    getRandomSentence() {
        return this.sentences[Math.floor(Math.random() * this.sentences.length)];
    },
    getRandomVote() {
        return this.votes[Math.floor(Math.random() * this.votes.length)];
    },
};