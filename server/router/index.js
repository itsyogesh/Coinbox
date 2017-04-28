const express = require('express')
const authController = require('../controllers/auth')
const userController = require('../controllers/user')
const walletController = require('../controllers/wallet')
const passport = require('../config/passport')
const middleware = require('../middleware')

module.exports = (app) => {
  const APIRoutes = express.Router()
  const walletRoutes = express.Router()
  const authRoutes = express.Router()
  const userRoutes = express.Router()

  APIRoutes.use('/', authRoutes)
  authRoutes.post('/signup', authController.register)
  authRoutes.post('/login', authController.login)

  APIRoutes.use('/', userRoutes)
  userRoutes.get('/profile', passport.isAuthenticated, userController.profile)

  APIRoutes.use('/wallets', walletRoutes)
  walletRoutes.post('/', passport.isAuthenticated, walletController.createWallet)
  walletRoutes.get('/', passport.isAuthenticated, middleware.wallet, walletController.getWallets)
  walletRoutes.get('/:walletId', passport.isAuthenticated, middleware.wallet, walletController.getWallet)

  app.use('/api', APIRoutes)
}
