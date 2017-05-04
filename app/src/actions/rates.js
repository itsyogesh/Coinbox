import API from '../api'
import {FIAT_RATES as constants} from '../config/constants'

const fetchAllRequest = () => {
  return {
    type: constants.FETCH_ALL_REQUEST,
    isLoading: true
  }
}

const fetchAllSuccess = (fiatRates) => {
  return {
    type: constants.FETCH_ALL_SUCCESS,
    isLoading: false,
    fiatRates
  }
}

const fetchAllError = (message) => {
  return {
    type: constants.FETCH_ALL_ERROR,
    isLoading: false,
    message
  }
}

const fetchRequest = (currencyCode) => {
  return {
    type: constants.FETCH_REQUEST,
    isLoading: true,
    currencyCode
  }
}

const fetchSuccess = (fiatRate) => {
  return {
    type: constants.FETCH_SUCCESS,
    isLoading: false,
    fiatRate
  }
}

const fetchError = (message) => {
  return {
    type: constants.FETCH_ERROR,
    isLoading: false,
    message
  }
}

const fetchFromIPRequest = () => {
  return {
    type: constants.FETCH_IP_REQUEST,
    isLoading: true
  }
}

const fetchFromIPSuccess = (fiatRate) => {
  return {
    type: constants.FETCH_IP_SUCCESS,
    isLoading: false,
    fiatRate
  }
}

const fetchFromIPError = (message) => {
  return {
    type: constants.FETCH_IP_ERROR,
    isLoading: false,
    message
  }
}

export const fetchFiatRates = () => {
  return (dispatch) => {
    dispatch(fetchAllRequest())

    API.fetchFiatRates()
      .then((response) => {
        if(response.statusText !== 'OK') {
          dispatch(fetchAllError(response.data))
          return Promise.reject(response)
        } else {
          dispatch(fetchAllSuccess(response.data))
        }
      })
  }
}

export const fetchFiatRate = (currencyCode) => {
  return (dispatch) => {
    dispatch(fetchRequest(currencyCode))

    API.fetchFiatRate(currencyCode)
      .then((response) => {
        if(response.statusText !== 'OK') {
          dispatch(fetchError(response.data))
          return Promise.reject(response)
        } else {
          dispatch(fetchSuccess(response.data))
        }
      })
  }
}

export const fetchFiatRateFromIP = () => {
  return (dispatch) => {
    dispatch(fetchFromIPRequest(currencyCode))

    API.fetchFiatRateFromIP(currencyCode)
      .then((response) => {
        if(response.statusText !== 'OK') {
          dispatch(fetchFromIPError(response.data))
          return Promise.reject(response)
        } else {
          dispatch(fetchFromIPSuccess(response.data))
        }
      })
  }
}

export const setCurrentCurrency = (currency) => {
  return dispatch => {
    dispatch({
      type: SET_DEFAULT_CURRENCY,
      currency
    })
  }
}
