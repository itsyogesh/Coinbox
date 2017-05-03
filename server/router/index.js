const express = require('express')
const authController = require('../controllers/auth')
const userController = require('../controllers/user')
const walletController = require('../controllers/wallet')
const fiatRatesController = require('../controllers/fiatCurrency')
const passport = require('../config/passport')
const middleware = require('../middleware')

module.exports = (app) => {
  const APIRoutes = express.Router()
  const walletRoutes = express.Router()
  const authRoutes = express.Router()
  const userRoutes = express.Router()
  const fiatRates = express.Router()

  APIRoutes.use('/', authRoutes)
  authRoutes.post('/signup', authController.register)
  authRoutes.post('/login', authController.login)

  APIRoutes.use('/', userRoutes)
  userRoutes.get('/profile', passport.isAuthenticated, userController.profile)

  APIRoutes.use('/rates', fiatRates)
  fiatRates.get('/', fiatRatesController.getRates)
  fiatRates.get('/locate', fiatRatesController.getRatesByIP)
  fiatRates.get('/:currencyCode', fiatRatesController.getRate)

  APIRoutes.use('/wallets', walletRoutes)
  walletRoutes.post('/', passport.isAuthenticated, walletController.createWallet)
  walletRoutes.get('/', passport.isAuthenticated, middleware.wallet, walletController.getWallets)
  walletRoutes.get('/:walletId', passport.isAuthenticated, middleware.wallet, walletController.getWallet)

  app.use('/api', APIRoutes)
}
