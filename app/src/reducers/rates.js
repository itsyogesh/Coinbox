import { FIAT_RATES as constants } from '../config/constants'

const initialState = {
  loading: true,
  defaultCurrency: 'INR'
}

const normalizeRates = (rates) => {
  let ratesObj = {}
  rates.forEach((rate) => {
    ratesObj[rate.code] = rate
  })
  return ratesObj
}

const addCurrencyToRates = (newRate, rates) => {
  return Object.assign({}, rates, {[newRate.code]: newRate})
}

const rates = (state = initialState, action) => {

  switch (action.type) {

    case constants.FETCH_ALL_REQUEST:
    return Object.assign({}, state)

    case constants.FETCH_ALL_SUCCESS:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      rates: normalizeRates(action.fiatRates)
    })

    case constants.FETCH_ALL_ERROR:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      error: action.message
    })

    case constants.FETCH_REQUEST:
    return Object.assign({}, state)

    case constants.FETCH_SUCCESS:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      rates: addCurrencyToRates(state.rates, action.fiatRate)
    })

    case constants.FETCH_ERROR:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      error: action.message
    })

    case constants.FETCH_IP_REQUEST:
    return Object.assign({}, state)

    case constants.FETCH_IP_SUCCESS:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      rates: addCurrencyToRates(state.rates, action.fiatRate)
    })

    case constants.FETCH_IP_ERROR:
    return Object.assign({}, state, {
      isLoading: action.isLoading,
      error: action.message
    })

    case constants.SET_DEFAULT_CURRENCY:
    return Object.assign({}, state, {
      defaultCurrency: action.currency
    })
  }
}

export default rates
