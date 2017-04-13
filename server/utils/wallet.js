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
      if(err) reject(err)
      resolve(balance)
    })
  })
}

const getTransactions = (client) => {
  return new Promise((resolve, reject) => {
    client.getTxHistory({}, (err, transactions) => {
      if(err) reject(err)
      resolve(transactions)
    })
  })
}

exports.create = create
exports.get = get
exports.getBalance = getBalance
exports.getTransactions = getTransactions
