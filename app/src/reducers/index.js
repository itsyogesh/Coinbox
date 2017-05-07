import { combineReducers } from 'redux'

import userReducer from './user'
import ratesreducer from './rates'

const App = combineReducers({
  user: userReducer,
  rates: ratesreducer
})

export default App
