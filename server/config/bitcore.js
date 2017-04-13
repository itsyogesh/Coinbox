const Client = require('bitcore-wallet-client');
const async = require('async')

const Wallet = require('../models/Wallet')
const walletUtil = require('../utils/wallet')

let client = new Client({
	baseUrl: process.env.BWS_INSTANCE_URL,
	verbose: false,
});

const walletMiddleware = (req, res, next) => {
  Wallet.find({userId: req.user._id})
    .then(wallets => {
      let response = []

      async.forEach(wallets, (wallet, cb) => {
        try {
          const walletClient = walletUtil.get(wallet.walletCredentials)
          const detailedWallet = {
            details: wallet,
            client: walletClient
          }
          console.log(detailedWallet)
          response.push(detailedWallet)
          cb()
        }
        catch (e) {
          cb(e)
        }
      }, (err) => {
        if(err) {
          return next(err)
        }
        if(!response[0]) return next('Something is wrong with the bitcoin network')
        req.wallets = response
        return next()
      })
    })
}

exports.walletMiddleware = walletMiddleware
exports.client = client
