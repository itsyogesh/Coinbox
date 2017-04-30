const path = require('path')

exports.emailConstants = {
  ACCOUNTS_FROM: 'hello@sandbox72164d5942004f4e8c1795eaf946305e.mailgun.org',
  CONFIRM_EMAIL_SUBJECT: 'Verify your Coinbox Account',
  CONFIRM_EMAIL_TEMPLATE_PATH: path.resolve(__dirname, '../templates', 'email', 'confirmEmail.html')
}

exports.jobNames = {
  CONFIRM_EMAIL: 'confirmation email',
  DEFAULT_WALLET: 'create default wallet',
  DEFAULT_WALLET_NAME: 'Personal Wallet'
}
