import API from '../api'
import { WALLET as constants } from '../config/constants'

const fetchAllRequest = () => {
  return {
    type: constants.FETCH_ALL_REQUEST,
    isLoading: true
  }
}

const fetchAllSuccess = (wallets) => {
  return {
    type: constants.FETCH_ALL_SUCCESS,
    isLoading: false,
    wallets
  }
}

const fetchAllError = (message) => {
  return {
    type: constants.FETCH_ALL_ERROR,
    isLoading: false,
    message
  }
}

const fetchRequest = (walletId) => {
  return {
    type: constants.FETCH_REQUEST,
    isLoading: true,
    walletId
  }
}

const fetchSuccess = (wallet) => {
  return {
    type: constants.FETCH_SUCCESS,
    isLoading: false,
    wallet
  }
}

const fetchError = (message) => {
  return {
    type: constants.FETCH_ERROR,
    isLoading: false,
    message
  }
}

export const fetchAllWallets = () => {
  return (dispatch) => {
    dispatch(fetchAllRequest())

    return API.fetchWallets()
      .then(response => {
        if(response.statusText !== 'OK') {
          return Promise.reject(response)
        } else {
          dispatch(fetchAllSuccess(response.data))
        }
      })
  }
}

export const fetchWallet = (walletId) => {
  return (dispatch) => {
    dispatch(fetchRequest(walletId))

    return API.fetchWallet(walletId)
      .then(response => {
        if(response.statusText !== 'OK') {
          return Promise.reject(response)
        } else {
          dispatch(fetchSuccess(response.data))
        }
      })
  }
}
