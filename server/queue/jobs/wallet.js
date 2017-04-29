const async = require('async')

const walletUtil = require('../../utils/wallet')
const addressUtil = require('../../utils/address')
const Wallet = require('../../models/Wallet')
const constants = require('../../utils/constants').jobNames

module.exports = (agenda) => {
  agenda.define(constants.DEFAULT_WALLET, (job, done) => {
    const data = job.data.attrs
    async.waterfall([
      (next) => {
        walletUtil.create('Default', data.email)
          .then((client) => next(null, client))
          .catch((err) => next(err))
      },
      (client, next) => {
        addressUtil.create(client)
          .then((address) => next(null, client, address))
          .catch((err) => next(err))
      },
      (client, address, next) => {
        const { credentials } = client
        let wallet = new Wallet({
          walletId: credentials.walletId,
          userId: data.userId,
          walletName: credentials.walletName,
          network: credentials.network,
          walletCredentials: client.export()
        })
        wallet.save()
          .then((wallet) => {
            next(null, client, wallet.toWalletObject())
          })
          .catch(err => next(err))
      },
      (client, wallet, next) => {
        addressUtil.createAddress(client)
          .then((address) => next(null, {wallet, address}))
          .catch((err) => next(err))
      }
    ], done)
  })
}
