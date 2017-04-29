const ejs = require('ejs') // eslint-disable-line no-unused-vars

const mailgun = require('../../config/mailgun')
const constants = require('../../utils/constants').emailConstants

const generateEmailParams = (options) => {
  return {
    from: constants.ACCOUNTS_FROM,
    to: options.to,
    subject: constants.CONFIRM_EMAIL_SUBJECT,
    template: {
      name: options.templatePath,
      engine: 'ejs',
      context: options.context
    }
  }
}

module.exports = (agenda) => {
  agenda.define('confirmation email', (job, done) => {
    const data = job.attrs.data
    let emailOptions = generateEmailParams({
      to: {
        name: data.firstName,
        address: data.email
      },
      templatePath: constants.CONFIRM_EMAIL_TEMPLATE_PATH,
      context: {
        firstName: data.firstName,
        token: data.token
      }
    })
    mailgun.sendMail(emailOptions, done)
  })

  agenda.define('reset password', (job, done) => {
    // TODO Look into reset password later
  })
}
