import { combineReducers } from 'redux'

import userReducer from './user'
import ratesReducer from './rates'
import walletsReducer from './wallets'

const App = combineReducers({
  user: userReducer,
  rates: ratesReducer,
  wallets: walletsReducer
})

export default App
