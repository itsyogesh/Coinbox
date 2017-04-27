
const createAddress = (client) => {
  if (!client) {
    let error = new Error('Wallet client required')
    return Promise.reject(error)
  }
  return new Promise((resolve, reject) => {
    client.createAddress({}, (err, address) => {
      if (err) return reject(err)
      return resolve(address)
    })
  })
}

exports.createAddress = createAddress
