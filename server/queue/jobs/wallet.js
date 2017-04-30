const async = require('async')

const walletUtil = require('../../utils/wallet')
const addressUtil = require('../../utils/address')
const Wallet = require('../../models/Wallet')
const constants = require('../../utils/constants').jobNames

module.exports = (agenda) => {
  agenda.define(constants.DEFAULT_WALLET, (job, done) => {
    const data = job.attrs.data
    async.waterfall([
      (next) => {
        walletUtil.create(constants.DEFAULT_WALLET_NAME, data.email)
          .then((client) => next(null, client))
          .catch((err) => next(err))
      },
      (client, next) => {
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
            next(null, client)
          })
          .catch(err => next(err))
      },
      (client, next) => {
        addressUtil.create(client)
          .then((address) => next(null, address))
          .catch((err) => next(err))
      }
    ], done)
  })
}
