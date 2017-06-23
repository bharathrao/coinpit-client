var rest     = require('rest.js')
var bluebird = require('bluebird')
var util     = require('util')
var affirm   = require('affirm.js')
var InsightUtil = require('insight-util')
var bitcoinutil = require('bitcoinutil')

module.exports = (function () {
  var client = {}

  client.getAccount = function (privKey, coinpitUrl) {
    affirm(privKey, 'private key required to create account')
    coinpitUrl = coinpitUrl || inferUrlFromPrivateKey(privKey)
    affirm(coinpitUrl, 'coinpit base url required to create account')
    var loginless = require("loginless")(coinpitUrl, "/api/v1")
    var address = bitcoinutil.addressFromPrivateKey(privKey)
    return loginless.getServerKey(address.publicKey)
      .then(function getConfigs(result) {
        loginless.initPrivateKey(result.serverPublicKey, privKey)
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

  function inferUrlFromPrivateKey(key) {
    return key[0] === 'K' || key[0] === 'L' ? "https://live.coinpit.io" : "https://live.coinpit.me"
  }

  return client
})()
