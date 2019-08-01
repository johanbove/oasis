'use strict'
const ssbClient = require('ssb-client')
const secretStack = require('secret-stack')
const ssbConfig = require('ssb-config')
const debug = require('debug')('oasis')

const rawConnect = () => new Promise((resolve, reject) => {
  ssbClient((err, api) => {
    if (err) return reject(err)
    resolve(api)
  })
})

const db = {
  connect: function () {
    return handle
  },
  /**
   * @param {function} method
   */
  get: function (method, ...opts) {
    return new Promise((resolve, reject) => {
      method(...opts, (err, val) => {
        if (err) return reject(err)
        resolve(val)
      })
    })
  },
  read: function (method, ...args) {
    return new Promise((resolve, reject) => {
      resolve(method(...args))
    })
  }
}

debug.enabled = true

const handle = new Promise((resolve, reject) => {
  rawConnect().then((ssb) => {
    debug('Using pre-existing Scuttlebutt server instead of starting one')
    resolve(ssb)
  }).catch(() => {
    debug('Initial connection attempt failed')
    debug('Starting Scuttlebutt server')

    const server = secretStack()

    server
      .use(require('ssb-db'))
      .use(require('ssb-onion'))
      .use(require('ssb-unix-socket'))
      .use(require('ssb-no-auth'))
      .use(require('ssb-plugins'))
      .use(require('ssb-master'))
      .use(require('ssb-gossip'))
      .use(require('ssb-replicate'))
      .use(require('ssb-friends'))
      .use(require('ssb-blobs'))
      .use(require('ssb-invite'))
      .use(require('ssb-local'))
      .use(require('ssb-logging'))
      .use(require('ssb-query'))
      .use(require('ssb-links'))
      .use(require('ssb-ws'))
      .use(require('ssb-ebt'))
      .use(require('ssb-ooo'))
      .use(require('ssb-backlinks'))
      .use(require('ssb-about'))

    server(ssbConfig)

    const connectOrRetry = () => {
      rawConnect().then((ssb) => {
        debug('Retrying connection to own server')
        resolve(ssb)
      }).catch((e) => {
        debug(e)
        connectOrRetry()
      })
    }

    connectOrRetry()
  })
})

module.exports = db