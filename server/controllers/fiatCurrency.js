const async = require('async')

const fiatUtil = require('../utils/fiat')
const countryUtil = require('../utils/country')

exports.getRate = (req, res, next) => {
  const currencyCode = req.params.currencyCode
  async.waterfall([
    next => {
      fiatUtil.getFiatRate(currencyCode, req.query.ts || Date.now())
        .then(rate => next(null, rate))
        .catch(err => next(err))
    }
  ], (err, rate) => {
    if (err) return next(err)
    return res.status(200).json(rate)
  })
}

exports.getRates = (req, res, next) => {
  fiatUtil.getFiatRates()
    .then(rates => {
      return res.status(200).json(rates)
    })
    .catch(err => next(err))
}

exports.getRatesByIP = (req, res, next) => {
  async.waterfall([
    next => {
      countryUtil.getCurrencyCodeFromIP(req.ip)
        .then((countryData) => {
          return next(null, countryData.code)
        })
        .catch(err => next(err))
    },
    (currencyCode, next) => {
      fiatUtil.getFiatRate(currencyCode, req.query.ts || Date.now())
        .then(rate => next(null, rate))
        .catch(err => next(err))
    }
  ], (err, rate) => {
    if (err) return next(err)
    return res.status(200).json(rate)
  })
}
