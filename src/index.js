module.exports = function (coinpitUrl) {
  var socket  = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var rest    = require('rest.js')
  var account = require("./account")
  var client  = {}

  client.getAccount = function (privKey) {
    return rest.get(coinpitUrl + '/api/config').then(function (response) {
      var config    = response.body
      var loginless = createLoginless(config)
      return loginless.getServerKey(privKey).then(createAccount).then(updateUserDetails)
    })
  }

  function updateUserDetails(account) {
    return account.getUserDetails().then(function () {
      return account
    })
  }

  function createLoginless(config) {
    return require("loginless")(coinpitUrl, "/api/auth/", config.network, console.log.bind(console))
  }

  function createAccount(serverResponse) {
    loginless.socket.register(socket)
    var insightUtil = getInsightUtil()
    return account(serverResponse, loginless, socket, insightUtil)
  }

  function getInsightUtil() {
    var config = serverResponse.config
    return require('insight-util')(config.blockchainapi.uri, config.blockchainapi.socketuri, config.network)
  }

  return client
}