const request = require('superagent')

const constants = require('../utils/constants').global

exports.getFiatRate = (currency, timestamp) => {
  return new Promise((resolve, reject) => {
    const RATES_API = `${constants.BITPAY_API}/rates/${currency}`
    request.get(RATES_API)
      .then((res) => {
        try {
          const rate = JSON.parse(res.text)
          return resolve(rate)
        } catch (err) {
          return reject(err)
        }
      })
      .catch((err) => reject(err))
  })
}

exports.getFiatRates = () => {
  return new Promise((resolve, reject) => {
    const RATES_API = `${constants.BITPAY_API}/rates`
    request.get(RATES_API)
    .then((res) => {
      try {
        const rates = JSON.parse(res.text)
        return resolve(rates)
      } catch (err) {
        return reject(err)
      }
    })
      .catch((err) => reject(err))
  })
}
