import { combineReducers } from 'redux'

import userReducer from './user'
import authReducer from './auth'
import ratesreducer from './rates'

const App = combineReducers({
  user: userReducer,
  rates: ratesreducer
})

export default App
