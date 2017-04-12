const Client = require('bitcore-wallet-client');

let client = new Client({
	baseUrl: process.env.BWS_INSTANCE_URL,
	verbose: false,
});

module.exports = client
