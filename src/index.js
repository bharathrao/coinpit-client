var rest        = require('rest.js')
var bluebird    = require('bluebird')
var util        = require('util')
var affirm      = require('affirm.js')
var InsightUtil = require('insight-util')
var bitcoinutil = require('bitcoinutil')

module.exports = (function () {
  var client = {}

  client.getAccount = function (key, coinpitUrl) {

    affirm(key, 'private key required to create account')
    coinpitUrl = coinpitUrl || inferUrlFromPrivateKey(key)
    affirm(coinpitUrl, 'coinpit base url required to create account')
    var loginless = require("loginless")(coinpitUrl, "/api/v1")
    var publicKey = getPublicKey(key)
    return loginless.getServerKey(publicKey)
      .then(function getConfigs(result) {
        if (key && key.secretKey) {
          loginless.initApiKey(result.serverPublicKey, key)
        } else {
          loginless.initPrivateKey(result.serverPublicKey, key)
        }
        return loginless.rest.get('/all/config')
      })
      .then(function createAccount(configs) {
        loginless.socket.register()
        var account = require("./account")(loginless, configs)
        account.init()
        return account
      })
      .then(function updateUserDetails(account) {
        var promises = bluebird.all([account.getAll(), account.updateAccountBalance()])
        return promises.then(function (response) {
          return account
        })
      })
  }

  function getPublicKey(key) {
    if (key.publicKey) return key.publicKey
    var address = bitcoinutil.addressFromPrivateKey(key)
    return address.publicKey
  }

  function inferUrlFromPrivateKey(key) {
    if (key.userid) return key.userid.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me"
    return key[0] === 'K' || key[0] === 'L' ? "https://live.coinpit.io" : "https://live.coinpit.me"
  }

  return client
})()
