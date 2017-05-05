import { AUTH_TOKEN as constants } from '../../config/constants'
import { fetchUser } from '../user'
import API from '../../api'

export const setAuthToken = (token) => {
  localStorage.setItem('token', token)
  API.setAuthHeaders(token)
  return {
    type: constants.SET,
    isAuthenticated: true
  }
}

export const setAuthenticated = () => {
  return {
    type: constants.USER_AUTHENTICATED,
    isAuthenticated: true
  }
}

export const removeAuthToken = () => {
  localStorage.removeItem('token')
  return {
    type: constants.REMOVE,
    isAuthenticated: false
  }
}

export const checkAuth = () => {
  return (dispatch, getState) => {
    if (localStorage.getItem('token')) {
      API.setAuthHeaders(localStorage.getItem('token'))
      dispatch(fetchUser())
    }
  }
}
