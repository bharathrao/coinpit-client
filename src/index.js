module.exports = function (coinpitUrl) {
  var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var rest   = require('rest.js')
  var bluebird = require('bluebird')
  var client = {}

  client.getAccount = function (privKey) {
    var config, loginless

    return rest.get(coinpitUrl + '/api/config').then(function (response) {
      config    = response.body
      loginless = createLoginless(config)
      return loginless.getServerKey(privKey).then(createAccount).then(updateUserDetails)
    })

    function updateUserDetails(account) {
      var promises = bluebird.all([account.getUserDetails(), account.updateAccountBalance()])
      return promises.then(function (response) {
        return account
      })
    }

    function createLoginless(config) {
      return require("loginless")(coinpitUrl, "/api/auth/", config.network, console.log.bind(console))
    }

    function createAccount(serverResponse) {
      loginless.socket.register(socket)
      var insightUtil = getInsightUtil()
      return require("./account")(serverResponse, loginless, socket, insightUtil)
    }

    function getInsightUtil() {
      return require('insight-util')(config.blockchainapi.uri, config.blockchainapi.socketuri, config.network)
    }

  }

  return client
}