const JWT = require('jsonwebtoken')
const crypto = require('crypto')
const validator = require('validator')
const passport = require('passport')
const series = require('async/series')

const User = require('../models/User')
const queue = require('../queue/worker')
const constants = require('../../utils/constants').jobNames

function generateWebToken (user) {
  return JWT.sign(user, process.env.SECRET)
}

exports.register = (req, res, next) => {
  let { errors, user } = validateUser(req.body)

  series({
    isUser: done => {
      checkUser(req.body.email)
      .then(isUser => { done(null, isUser) })
      .catch(err => { done(err) })
    },
    token: done => {
      generateEmailToken()
      .then(token => { done(null, token) })
      .catch(err => { done(err) })
    }
  }, (err, results) => {
    if (err) {
      return next(err)
    }
    if (results.isUser) errors['email'] = 'Email is already in use'

    if (Object.keys(errors).length) {
      let err = new Error('Invalid data')
      err.statusCode = 422
      err.details = errors
      return next(err)
    }

    user['token'] = {}
    user.token['emailToken'] = results.token
    let mongoUser = new User(user)
    mongoUser.save()
    .then(user => {
      user = user.toUserObject()
      queue.now(constants.DEFAULT_WALLET, {
        email: user.email,
        userId: user._id
      })
      queue.now(constants.CONFIRM_EMAIL, {
        email: user.email,
        token: results.token,
        firstName: user.profile.firstName
      })
      const webToken = generateWebToken({
        email: user.email,
        _id: user._id
      })
      res.status(201).json({
        user,
        token: `JWT ${webToken}`
      })
    })
    .catch(err => {
      return next(err)
    })
  })
}

exports.login = (req, res, next) => {
  passport.authenticate('local', {session: false}, (err, user, info) => {
    if (err) return next(err)
    if (!user) {
      return next({
        statusCode: 401,
        message: info.error
      })
    }
    User.findById(user._id)
    .then((user) => {
      user = user.toUserObject()
      const webToken = generateWebToken({
        email: user.email,
        _id: user._id
      })
      return res.status(200).json({
        user,
        token: `JWT ${webToken}`
      })
    })
  })(req, res, next)
}

const generateEmailToken = () => {
  return new Promise(function (resolve, reject) {
    crypto.randomBytes(20, function (err, buf) {
      if (err) {
        reject(err)
        return
      }
      resolve(buf.toString('hex'))
    })
  })
}

const checkUser = (email) => {
  return new Promise(function (resolve, reject) {
    User.findOne({email}, (err, existingUser) => {
      if (err) {
        reject(err)
        return
      }
      resolve(!!existingUser)
    })
  })
}

const validateUser = (body) => {
  let errors = {}
  let user = {}
  user['profile'] = {}

  if (!body.email || !validator.isEmail(validator.trim(body.email))) {
    errors['email'] = 'Invalid email'
  } else {
    user['email'] = validator.trim(body.email)
  }

  if (!body.password) {
    errors['password'] = 'Invalid password'
  } else {
    user['password'] = body.password
  }

  if (!body.firstName || !validator.isAlpha(validator.trim(body.firstName))) {
    errors['firstName'] = 'Invalid first name.'
  } else {
    user.profile['firstName'] = validator.trim(body.firstName)
  }

  if (!body.lastName || !validator.isAlpha(validator.trim(body.lastName))) {
    errors['lastName'] = 'Invalid last name.'
  } else {
    user.profile['lastName'] = validator.trim(body.lastName)
  }

  return {errors, user}
}
