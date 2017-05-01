const path = require('path')
const csvParse = require('csv-parse')
const fs = require('fs')
const async = require('async')
const geo = require('geosearch')
const constants = require('./constants').global

const countryCurrencyMapPath = path.resolve(__dirname, '../bin', 'country-currency.csv')

const countryCurrencyMap = () => {
  return new Promise((resolve, reject) => {
    async.waterfall([
      next => {
        fs.readFile(countryCurrencyMapPath, 'utf8', (err, data) => {
          if (err) return next(err)
          else return next(null, data)
        })
      },
      (file, next) => {
        csvParse(file, {columns: true}, (err, data) => {
          if (err) return next(err)
          else return next(null, data)
        })
      }
    ], (err, data) => {
      if (err) return reject(err)
      const map = {}
      data.forEach(country => {
        map[country.countryCode] = country
      })
      return resolve(map)
    })
  })
}

const getCurrencyCodeFromCountry = (countryCode) => {
  return new Promise((resolve, reject) => {
    countryCurrencyMap()
    .then((data) => {
      console.log(countryCode)
      console.log(data)
      if (data[countryCode]) {
        return resolve(data[countryCode])
      } else {
        return reject(new Error('No such country code found'))
      }
    })
    .catch(err => reject(err))
  })
}

const getCurrencyCodeFromIP = (ipAddress) => {
  return new Promise((resolve, reject) => {
    async.waterfall([
      next => {
        geo.lookup(ipAddress, (err, result) => {
          if (err) return next(null, constants.DEFAULT_COUNTRY_CODE)
          else return next(null, result.countryCode)
        })
      },
      (countryCode, next) => {
        getCurrencyCodeFromCountry(countryCode)
          .then((data) => next(null, data))
          .catch((err) => next(err))
      }
    ], (err, data) => {
      if (err) return reject(err)
      else return resolve(data)
    })
  })
}

exports.countryCurrencyMap = countryCurrencyMap
exports.getCurrencyCodeFromCountry = getCurrencyCodeFromCountry
exports.getCurrencyCodeFromIP = getCurrencyCodeFromIP
