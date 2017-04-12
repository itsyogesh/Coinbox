const mongoose = require('mongoose')

const utils = require('./utils')

const WalletSchema = new mongoose.Schema({
  walletId: {type: String, required: true},
  userId: {type: ObjectId, required: true},
  walletName: {type: String, required: true},
  network: {type: String, enum: utils.networkTypes},
  walletAuth: {type: String, required: true}
})

module.exports = mongoose.model('Wallet', WalletSchema)
