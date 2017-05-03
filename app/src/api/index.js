import axios from 'axios'

let defaultAPI = axios.create({
  baseURL: 'http://localhost:8080/api'
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

const fetchFiatRates = (currencyCode) => {
  const params = currencyCode ? {code: currencyCode} : null
  return defaultAPI.get('/rates', {params})
}

const setAuthHeaders = (token) => {
  defaultAPI.defaults.headers.common['Authorization'] = token
}

export default {
  signup,
  login,
  fetchUser,
  setAuthHeaders
}
