import axios from 'axios'

const baseURL = (process.env.NODE_ENV === 'production') ?
                process.env.REACT_APP_PRODUCTION_URL :
                process.env.REACT_APP_DEVELOPMENT_URL

let defaultAPI = axios.create({
  baseURL: `${baseURL}/api`
})

const signup = (userDetails) => {
  return defaultAPI.post('/signup', userDetails)
}

const login = ({email, password}) => {
  return defaultAPI.post('/login', {
    email,
    password
  })
}

const fetchWallets = () => {
  return defaultAPI.get(`/wallets`)
}

const fetchWallet = (walletId) => {
  return defaultAPI.get(`/wallets/${walletId}`)
}

const fetchUser = () => {
  return defaultAPI.get('/profile')
}

const fetchFiatRates = () => {
  return defaultAPI.get('/rates')
}

const fetchFiatRate = (currencyCode) => {
  return defaultAPI.get(`/rates/${currencyCode}`)
}

const fetchFiatRateFromIP = () => {
  return defaultAPI.get(`/rates/locate`)
}

const setAuthHeaders = (token) => {
  defaultAPI.defaults.headers.common['Authorization'] = token
}

export default {
  signup,
  login,
  fetchUser,
  fetchWallets,
  fetchWallet,
  fetchFiatRates,
  fetchFiatRate,
  fetchFiatRateFromIP,
  setAuthHeaders
}
