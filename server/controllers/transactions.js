const async = require('async')
const validator = require('validator')

const walletUtil = require('../utils/wallet')
const Wallet = require('../models/Wallet')

const sendtransaction = (req, res, next) => {

  selectedWallet = walletUtil.getSelectedWallet(req.wallets, req.body.walletId)

  let options = {
    amount: req.body.amount,
    address: req.body.address,
    message: req.body.message || null
  }

  walletUtil.createSendTransaction(selectedWallet.client, options)
    .then((memo) => {
      return res.status(200).send(memo)
    })
    .catch((err) => {
      return next(err)
    })
}
