const { gql } = require('apollo-server');

module.exports = gql`
    type User {
        username: String!
        email: String
        language: String!
        token: String
        createdAt: String
        imageUrl: String
        latestMessage: Message
    }
    type Message {
        uuid: String!
        content: String!
        from: String!
        to: String!
        createdAt: String!
        reactions: [Reaction]
    }
    type Reaction {
        uuid: String!
        content: String!
        createdAt: String!
        message: Message!
        user: User
    }
    type Translation {
        string: String!
    }
    type Query {
        getUsers: [User]!
        login(username: String! password: String!): User!
        getMessages(from: String!): [Message]!
        getTranslation(string: String! to: String from: String): Translation!
    }
    type Mutation {
        register(username: String! email: String! language: String! password: String! confirmPassword: String!): User!
        sendMessage(to:String! content:String!): Message!
        reactToMessage(uuid:String! content: String!): Reaction!
    }
    type Subscription {
        newMessage: Message!
        newReaction: Reaction!
    }
`