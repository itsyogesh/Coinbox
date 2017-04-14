const client = require('../config/bitcore').client

const NUMBER_OF_COPAYERS = 1

const create = (name, email) => {
  return new Promise((resolve, reject) => {
    client.createWallet(
      name,
      email,
      NUMBER_OF_COPAYERS,
      NUMBER_OF_COPAYERS,
      {network: process.env.BITCOIN_NETWORK},
      (err, secret) => {
        if(err) return reject(err)
        return resolve(client)
      }
    )
  })
}

const get = (credentials) => {
  client.import(credentials)
  return client
}

const getBalance = (client) => {
  return new Promise((resolve, reject) => {
    client.getBalance({}, (err, balance) => {
      if(err) {
        reject(err)
      } else {
        resolve(balance)
      }
    })
  })
}

const getTransactions = (client) => {
  return new Promise((resolve, reject) => {
    client.getTxHistory({}, (err, transactions) => {
      if(err) {
        reject(err)
      } else {
        resolve(transactions)
      }
    })
  })
}

const getSelectedWallet(wallets, walletId) => {
  const walletIds = wallets.map((wallet) => {
    return wallet.details._id.toString()
  })

  if(walletIds.indexOf(req.params.walletId) > -1) {
    return {
      client: wallets[walletIds.indexOf(walletId)].client
      details: wallets[walletIds.indexOf(walletId)].details
    }

}

const createSendTransaction = (client, options) => {
  return new Promise((resolve, reject) => {
    let outputs = [{
      amount: options.amount,
      toAddress: options.address
    }]
    let opts = {
      outputs: outputs,
      message: options.message || null
    }
    client.createTxProposal(opts, (err, transactionId) => {
      if(err) {
        reject(err)
      } else {
        publishTransactionProposal(client, transactionId)
          .then(() => {
            signTransactionProposal(client, transactionId)
              .then(() => {
                broadcastTransactionProposal(client, transactionId)
                  .then((memo) => resolve(memo))
                  .catch((err) => reject(err))
              })
              .catch((err) => reject(err))
          })
          .catch(err => reject(err))
      }
    })
  })
}

const publishTransactionProposal => (client, transactionId) => {
  return new Promise((resolve, reject) => {
    client.publishTxProposal({txp: transactionId}, (err, txp) => {
      if (err) {
        reject(err)
      } else {
        return Promise.resolve()
      }
    })
  })
}

const signTransactionProposal => (client, transactionId) => {
  return new Promise((resolve, reject) => {
    client.signTxProposal(transactionId, (err, txp) => {
      if (err) {
        reject(err)
      } else {
        return Promise.resolve()
      }
    })
  })
}

const signTransactionProposal => (client, transactionId) => {
  return new Promise((resolve, reject) => {
    client.signTxProposal(transactionId, (err, txp) => {
      if (err) {
        reject(err)
      } else {
        return Promise.resolve()
      }
    })
  })
}

const broadcastTransactionProposal => (client, transactionId) => {
  return new Promise((resolve, reject) => {
    client.broadcastTxProposal(transactionId, (err, txp, memo) => {
      if (err) {
        reject(err)
      } else {
        resolve(memo)
      }
    })
  })
}

exports.create = create
exports.get = get
exports.getBalance = getBalance
exports.getTransactions = getTransactions
exports.getSelectedWallet = getSelectedWallet
exports.createSendTransaction = createSendTransaction
