const Client = require('bitcore-wallet-client')
const clientConfig = require('../config/bitcore')

exports.getFiatRate = (currency, timestamp) => {
  let client = new Client(clientConfig)
  const options = {
    code: currency,
    timestamp: timestamp
  }
  return new Promise((resolve, reject) => {
    client.getFiatRate = (options, (err, rates) => {
      if (err) return reject(err)
      else return resolve(rates)
    })
  })
}
