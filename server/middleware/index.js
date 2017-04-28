const walletMiddleware = require('./walletMiddleware')
const userVerified = require('./userVerifiedMiddleware')

module.exports = {
  wallet: walletMiddleware,
  verifyUser: userVerified
}
