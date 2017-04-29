const path = require('path')

exports.emailConstants = {
  ACCOUNTS_FROM: 'account@coinbox.xyz',
  CONFIRM_EMAIL_SUBJECT: 'Verify your Coinbox Account',
  CONFIRM_EMAIL_TEMPLATE_PATH: path.resolve(__dirname, 'templates', 'email', 'confirmEmail.html')
}

exports.jobNames = {
  CONFIRM_EMAIL: 'confirmation email',
  DEFAULT_WALLET: 'create default wallet'
}
