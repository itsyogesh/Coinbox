import { combineReducers } from 'redux'

import userReducer from './user'
import authReducer from './auth'
import ratesreducer from './rates'

const App = combineReducers({
  isAuthenticated: authReducer,
  user: userReducer,
  rates: ratesreducer
})

export default App
