module.exports = (req, res, next) => {
  if (req.user.meta.isVerified) {
    return next()
  } else {
    const err = new Error('User is not verified')
    next(err)
  }
}
