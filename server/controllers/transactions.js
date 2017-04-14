const async = require('async')
const validator = require('validator')

const walletUtil = require('../utils/wallet')
const Wallet = require('../models/Wallet')

const sendtransaction = (req, res, next) => {

  selectedWallet = walletUtil.getSelectedWallet(req.wallets, req.params.walletId)
  
}
