const async = require('async')
const validator = require('validator')

const walletUtil = require('../utils/wallet')
const Wallet = require('../models/Wallet')


exports.createWallet = (req, res, next) => {
  let errors = {}

  if(!req.body.name) {
    errors['name'] = 'Name is required'
  }

  if(Object.keys(errors).length) {
    let err = new Error('Invalid data')
    err.statusCode = 422
    err.details = errors
    return next(err)
  }

  async.waterfall([
    (next) => {
      walletUtil.create(req.body.name, req.user.email)
      .then((client) => next(null, client))
      .catch((err) => next(err))
    },
    (client, next) => {
      const { credentials } = client
      let wallet = new Wallet({
        walletId: credentials.walletId,
        userId: req.user._id,
        walletName: credentials.walletName,
        network: credentials.network,
        walletCredentials: client.export()
      })
      wallet.save()
      .then((wallet) => {
        next(null, wallet.toWalletObject())
      })
      .catch(err => next(err))
    }
  ], (err, wallet) => {

    if(err) return next(err)
    res.status(201).json(wallet)
  })
}

exports.getWallets = (req, res, next) => {
  console.log(req.wallets)
  let response = []

  async.forEach(req.wallets, (wallet, cb) => {
    async.parallel({
      balance: (cb) => {
        walletUtil.getBalance(wallet.client)
        .then(balance => cb(null, balance))
        .catch(err => cb(err))
      },
      transactions: (cb) => {
        walletUtil.getTransactions(wallet.client)
        .then(transactions => cb(null, transactions))
        .catch(err => cb(err))
      }
    }, (err, results) => {
      if(err) cb(err)
      const detailedWallet = Object.assign({}, wallet.details.toWalletObject(), {
        balance: results.balance,
        transactions: results.transactions
      })
      response.push(detailedWallet)
      cb()
    })
  }, (err) => {
    if(err) {
      return next(err)
    }
    if(!response[0]) return next('Something is wrong with the bitcoin network')
    return res.status(201).json(response)
  })
}

exports.getWallet = (req, res, next) => {

  const walletClient = walletUtil.getSelectedWallet(req.wallets, req.params.walletId).client
  const walletDetails = walletUtil.getSelectedWallet(req.wallets, req.params.walletId).details

  if(!walletClient || !walletDetails) {
    let err = new Error('Wallet not available')
    err.statusCode = 404
    err.details = (`No wallet with id ${req.params.walletId}`)
    return next(err)
  }

  async.parallel({
    balance: (cb) => {
      walletUtil.getBalance(walletClient)
      .then(balance => cb(null, balance))
      .catch(err => cb(err))
    },
    transactions: (cb) => {
      walletUtil.getTransactions(walletClient)
      .then(transactions => cb(null, transactions))
      .catch(err => cb(err))
    }
  }, (err, results) => {
    if(err) return next(err)
    const response =  Object.assign({}, walletDetails.toWalletObject(), {
      balance: results.balance,
      transactions: results.transactions
    })
    return res.status(200).json(response)
  })
}
