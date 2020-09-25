const { User, Message } = require('../../models');
const bcrypt = require('bcryptjs')
const { UserInputError, AuthenticationError } = require("apollo-server")
const jwt = require('jsonwebtoken')
const { Op } = require('sequelize')
module.exports = {
    Query: {
        getUsers: async (_, __, {user}) => {
            try {
                if(!user) throw new AuthenticationError('Unauthenticated');
                let users = await User.findAll({
                    attributes: ['username', 'imageUrl', 'createdAt', "language"],
                    where: {username: { [Op.ne]: user.username}}
                });

                const allUserMessages = await Message.findAll({
                    where: {
                        [Op.or]: [{from: user.username}, {to: user.username}]
                    },
                    order: [['createdAt', 'DESC']]
                })

                users = users.map(otherUser => {
                    const latestMessage = allUserMessages.find(m => m.from == otherUser.username || m.to == otherUser.username)
                    otherUser.latestMessage = latestMessage
                    return otherUser
                })
                return users;
            } catch(err) {
                throw err
            }
        },
        login: async (_, args) => {
            const { username, password } = args
            let errors = {}
            try {
                if(username.trim() == '') {
                    errors.username = "username must not be empty"
                }
                if(password == '') {
                    errors.password = "password must not be empty"
                }
                if(Object.keys(errors).length) {
                    throw new UserInputError("Bad Input", {errors})
                }
                const user = await User.findOne({
                    where: {username}
                })
                if(!user) {
                    errors.username = "Username not found"
                    throw new UserInputError('Bad Input', { errors})
                }
                const correctPassword = await bcrypt.compare(password, user.password)
                if(!correctPassword) {
                    errors.password = "Password is incorrent"
                    throw new UserInputError("Authentication Error", {errors})
                }
                const token = jwt.sign({
                    username
                }, process.env.JWT_SECRET, { expiresIn: 60 * 60})
                
                return {
                    ...user.toJSON(),
                    token
                }
            } catch(err) {
                throw err
            }
        }
    },
    Mutation: {
        register: async (_, args) => {
            let { username, email, password, confirmPassword, language } = args
            let errors = {}
            try {
                if(email.trim() == '') errors.email = "Email must not be empty"
                if(username.trim() == '') errors.username = "Username must not be empty"
                if(password.trim() == '') errors.password= "Password must not be empty"
                if(!language) errors.language= "Please select a language"
                if(confirmPassword.trim() == '') errors.confirmPassword = "Confirm Password must not be empty"
                if(confirmPassword != password) errors.password = "Password must match"

                // const checkUserByUsername = await User.findOne({where: {username}})
                // const checkUserByEmail = await User.findOne({where: {username}})
                // if(checkUserByUsername) errors.username = "Username is taken"
                // if(checkUserByEmail) errors.email = "Email is taken"

                if(Object.keys(errors).length) {
                    throw errors
                }
                password = await  bcrypt.hash(password, 6)
                const user = await User.create({
                    username, email, password, language
                })
                return user;
            } catch(err) {
                console.log(err);
                if(err.name == "SequelizeUniqueConstraintError") {
                    err.errors.forEach((e) => {
                        errors[e.path] = `${e.path} is already taken`
                    })
                }
                else if(err.name == "SequelizeValidationError") {
                    err.errors.forEach((e) => {
                        errors[e.path] = e.message
                    })
                }
                throw new UserInputError("Bad input", {errors})
            }
        },
    }
}