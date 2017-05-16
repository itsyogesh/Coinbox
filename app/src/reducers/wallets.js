import { WALLET as constants } from '../config/constants'

const initialState = {
  isLoading: true
}

const normalizeWallets = (wallets) => {
  let walletsObj = {}
  wallets.forEach((wallet) => {
    walletsObj[wallet._id] = wallet
  })
  return walletsObj
}

const addWalletToWallets = (wallets, wallet) => {
  return Object.assign({}, wallets, {[wallet._id]: wallet})
}

const wallets = (state = initialState, action) => {

  switch (action.type) {

    case constants.FETCH_ALL_REQUEST:
      return Object.assign({}, state, {
        isLoading: action.isLoading
      })

    case constants.FETCH_ALL_SUCCESS:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
        items: normalizeWallets(action.wallets)
      })

    case constants.FETCH_ALL_ERROR:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
        error: action.error
      })

    case constants.FETCH_REQUEST:
      return Object.assign({}, state, {
        isLoading: action.isLoading
      })

    case constants.FETCH_SUCCESS:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
        items: addWalletToWallets(state.items, action.wallet)
      })

    case constants.FETCH_ERROR:
      return Object.assign({}, state, {
        isLoading: action.isLoading,
        error: action.error
      })

    default:
      return state
  }
}

export default wallets
