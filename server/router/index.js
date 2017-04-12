const express = require('express')
const authController = require('../controllers/auth')
const userController = require('../controllers/user')
const passport = require('../config/passport')

module.exports = (app) => {
  const APIRoutes = express.Router()
  const projectRoutes = express.Router()
  const authRoutes = express.Router()
  const userRoutes = express.Router()

  APIRoutes.use('/', authRoutes)
  authRoutes.post('/signup', authController.register)
  authRoutes.post('/login', authController.login)

  APIRoutes.use('/', userRoutes)
  userRoutes.get('/profile', passport.isAuthenticated, userController.profile)

  app.use('/api', APIRoutes)
}
