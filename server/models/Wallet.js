const mongoose = require('mongoose')

const WalletSchema = new mongoose.Schema({
  walletId: {type: String, required: true, index: true},
  userId: {type: mongoose.Schema.ObjectId, required: true, index: true},
  walletName: {type: String, required: true},
  network: {type: String, required: true},
  meta: {
    isDefault: {type: Boolean, default: false},
    currency: {type: String, default: 'BTC'}
  },
  copayerId: {type: String},
  walletCredentials: {type: String, required: true}
})

WalletSchema.methods.toWalletObject = function () {
  let wallet = this.toObject()
  delete wallet.walletCredentials
  delete wallet.__v
  return wallet
}

module.exports = mongoose.model('Wallet', WalletSchema)
