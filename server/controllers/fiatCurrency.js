const async = require('async')

const fiatUtil = require('../utils/fiat')
const countryUtil = require('../utils/country')

exports.getRates = (req, res, next) => {
  const currencyCode = req.query.code
  async.waterfall([
    next => {
      if (currencyCode) {
        next(null, currencyCode)
      } else {
        countryUtil.getCurrencyCodeFromIP(req.ip)
          .then((countryData) => {
            return next(null, countryData.code)
          })
          .catch(err => next(err))
      }
    },
    (currencyCode, next) => {
      fiatUtil.getFiatRate(currencyCode, req.query.ts || Date.now())
        .then(rates => next(null, rates))
        .catch(err => next(err))
    }
  ], (err, rates) => {
    if (err) return next(err)
    return res.status(200).json(rates)
  })
}
