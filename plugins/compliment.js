const compliments = [
    "You're amazing just the way you are!",
    "You have a great sense of humor!",
    "You're incredibly thoughtful and kind.",
    "You are more powerful than you know.",
    "You light up the room!",
    "You're a true friend.",
    "You inspire me!",
    "Your creativity knows no bounds!",
    "You have a heart of gold.",
    "You make a difference in the world.",
    "Your positivity is contagious!",
    "You have an incredible work ethic.",
    "You bring out the best in people.",
    "Your smile brightens everyone's day.",
    "You're so talented in everything you do.",
    "Your kindness makes the world a better place.",
    "You have a unique and wonderful perspective.",
    "Your enthusiasm is truly inspiring!",
    "You are capable of achieving great things.",
    "You always know how to make someone feel special.",
    "Your confidence is admirable.",
    "You have a beautiful soul.",
    "Your generosity knows no limits.",
    "You have a great eye for detail.",
    "Your passion is truly motivating!",
    "You are an amazing listener.",
    "You're stronger than you think!",
    "Your laughter is infectious.",
    "You have a natural gift for making others feel valued.",
    "You make the world a better place just by being in it.",
    "You're a ray of sunshine on a cloudy day.",
    "You have an extraordinary imagination!",
    "Your sense of style is impeccable.",
    "You're the definition of grace and elegance.",
    "You have a magnetic personality.",
    "Your determination is inspiring.",
    "You're one of a kind!",
    "Your optimism brightens everyone's day.",
    "You have a fantastic sense of adventure.",
    "Your intelligence is impressive.",
    "You make people feel comfortable and safe.",
    "Your honesty is refreshing.",
    "You have a knack for making people smile.",
    "Your voice is soothing and uplifting.",
    "You're effortlessly charming.",
    "Your ideas are brilliant and innovative.",
    "You have the heart of a hero.",
    "Your energy is contagious!",
    "You make challenges look easy.",
    "You handle situations with amazing wisdom.",
    "You’re the kind of person everyone wants in their corner.",
    "Your resilience is admirable.",
    "You have a special way of making people feel valued.",
    "You’re a bundle of joy!",
    "You turn ordinary moments into unforgettable memories.",
    "Your hugs are magical.",
    "You have a gift for seeing the good in others.",
    "You make complicated things seem simple.",
    "Your perspective is enlightening.",
    "You bring hope and happiness wherever you go."
];
export default {
    command: 'compliment',
    aliases: ['praise', 'nice'],
    category: 'group',
    description: 'Send a random compliment to a user',
    usage: '.compliment @user',
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        try {
            if (!message || !chatId) {
                console.log('Invalid message or chatId:', { message, chatId });
                return;
            }
            let userToCompliment;
            if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                userToCompliment =
                    message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToCompliment =
                    message.message.extendedTextMessage.contextInfo.participant;
            }
            if (!userToCompliment) {
                await sock.sendMessage(chatId, {
                    text: 'Please mention someone or reply to their message to compliment them!'
                }, { quoted: message });
                return;
            }
            const compliment = compliments[Math.floor(Math.random() * compliments.length)];
            await new Promise(resolve => setTimeout(resolve, 1000));
            await sock.sendMessage(chatId, {
                text: `Hey @${userToCompliment.split('@')[0]}, ${compliment}`,
                mentions: [userToCompliment]
            }, { quoted: message });
        }
        catch (error) {
            console.error('Error in compliment command:', error);
            if (error?.data === 429) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    await sock.sendMessage(chatId, {
                        text: 'Please try again in a few seconds.'
                    }, { quoted: message });
                }
                catch (retryError) {
                    console.error('Error sending retry message:', retryError);
                }
            }
            else {
                try {
                    await sock.sendMessage(chatId, {
                        text: 'An error occurred while sending the compliment.'
                    }, { quoted: message });
                }
                catch (sendError) {
                    console.error('Error sending error message:', sendError);
                }
            }
        }
    }
};
