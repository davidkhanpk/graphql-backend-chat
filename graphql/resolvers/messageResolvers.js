const { User, Message, Reaction } = require('../../models');
const { UserInputError, AuthenticationError, withFilter, ForbiddenError } = require("apollo-server")
const { Op } = require('sequelize')
const translate = require('@vitalets/google-translate-api');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

module.exports = {
    Query: {
        getMessages: async (parent, {from}, {user}) => {
            try {
                if(!user) throw new AuthenticationError('Unauthenticated');
                const otherUser = await User.findOne({
                    where: {username: from}
                })
                if(!otherUser) throw new UserInputError("User not found")
                const usernames = [user.username, otherUser.username];
                const messages = await Message.findAll({
                    where: {
                        from: { [Op.in]: usernames},
                        to: { [Op.in]: usernames}
                    },
                    order: [['createdAt', "DESC"]],
                    include: [{model: Reaction, as: 'reactions'}]
                })
                return messages
            } catch(err) {
                throw err
            }
        },
        getTranslation(parent, {string, to, from}, {user}) {
            try {
                if(!user) throw new AuthenticationError('Unauthenticated');
                translate(string, {to: 'en'}).then(res => {
                    return res.text;
                }).catch(err => {
                    throw new UserInputError('Language Failed')
                });
            } catch(err) {
                throw err
            }
        }
    },
    Mutation: {
        sendMessage: async (parent, {to, content}, { user }) => {
            try {
                if(!user) throw new AuthenticationError('Unauthenticated');
                const recipient = await User.findOne({where: {username: to }})
                if(!recipient) {
                    throw new UserInputError('User not found')
                } else if(recipient.username == user.username) {
                    throw new UserInputError("You can't message yourself")
                }
                if(content.trim() == '') {
                    throw new UserInputError("Message is empty")
                }
                const message = await Message.create({
                    from: user.username,
                    to,
                    content
                })

                pubsub.publish("NEW_MESSAGE", {newMessage: message})
                return message
            } catch(err) {
                throw err
            }
        },
        reactToMessage: async (_, { uuid, content }, { user }) => {
            const reactions = ['❤️', '😆', '😯', '😢', '😡', '👍', '👎']
            try {
                if(!reactions.includes(content)) {
                throw new UserInputError("Invalid Reaction")
                }
                let username = user ? user.username : '';
                user = await User.findOne({ where: {username}})
                if(!user) {
                    throw new AuthenticationError('Unauthenticated')
                }
                const message = await Message.findOne({ where: {uuid}})
                if(!message) throw new UserInputError('Message not Found');
                if(message.from !== user.username && message.to !== user.username) {
                    throw new ForbiddenError("Unauthorized")
                }

                const reaction = await Reaction.findOne({
                    where: {messageId: message.id, userId: user.id}
                })

                if(reaction) {
                    reaction.content = content
                    await reaction.save()
                } else {
                    console.log("saving reaction")
                    reaction = await Reaction.create({
                        messageId: message.id,
                        userId: user.id,
                        content
                    })
                    console.log(reaction)
                    pubsub.publish('NEW_REACTION', { newReaction: reaction})
                }
                return reaction
            } catch(err) {
                console.log(err)
                throw err
            }
        }
    },
    Subscription: {
        newMessage: {
            subscribe: () => {
                console.log(pubsub)
                let it =pubsub.asyncIterator(['NEW_MESSAGE'])
                return it
            }
        },
        
        newReaction: {
            subscribe: () => {
                let iti = pubsub.asyncIterator(['NEW_REACTION'])
                return iti
            }
        },
        // newMessage: {
        //     subscribe: withFilter((_, __, {user, pubsub}) => {
        //         if(!user) throw new AuthenticationError('Unauthenticated')
        //         return pubsub.asyncIterator(['NEW_MESSAGE'])
        //     }, ({ newMessage}, _, { user }) => {
        //         // console.log(newMessage);
        //         // console.log(user);
        //         if(newMessage.from === user.username || newMessage.to === user.username) {
        //             console.log("returning true");
        //             return true
        //         }
        //         return false
        //     })
        // },
        // newReaction: {
        //     subscribe: withFilter((_, __, {user, pubsub}) => {
        //         if(!user) throw new AuthenticationError('Unauthenticated')
        //         return pubsub.asyncIterator('NEW_REACTION')
        //     }, async ({ newReaction }, _, { user }) => {
        //         // console.log(newMessage);
        //         // console.log(user);
        //         const message = await newReaction.getMessage()
        //         if(message.from === user.username || message.to === user.username) {
        //             console.log("returning true");
        //             return true
        //         }
        //         return false
        //     })
        // }
    }
}