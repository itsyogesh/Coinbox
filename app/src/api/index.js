import axios from 'axios'

export const defaultAPI = axios.create({
  baseURL: 'http://localhost:8080/api'
})

export const signup = (userDetails) => {
  return defaultAPI.post('/signup', userDetails)
}

export const login = ({email, password}) => {
  return defaultAPI.post('/login', {
    email,
    password
  })
}

export const fetchUser = () => {
  return defaultAPI.get('/profile')
}
