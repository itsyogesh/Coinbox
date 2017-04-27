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

const fetchAllError = (error) => {
  
}
