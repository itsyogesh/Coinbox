const Agenda = require('agenda')

const connectionOpts = {
  db: {
    address: process.env.DB,
    collection: 'Jobs',
    options: {
      server: {
        auto_reconnect: true
      }
    }
  }
}

const agenda = new Agenda(connectionOpts)

var jobTypes = process.env.JOB_TYPES ? 
