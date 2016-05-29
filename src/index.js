module.exports = function (coinpitUrl) {
  var socket    = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var network   = coinpitUrl.indexOf("live.coinpit.io") !== -1 ? "bitcoin" : "testnet"

  var loginless = require("loginless")(coinpitUrl, "/api/auth/", network, console.log.bind(console))
  var account = require("./account")
  var client  = {}

  client.getAccount = function (privKey) {
    return loginless.getServerKey(privKey).then(function (serverResponse) {
      loginless.socket.register(socket)
      return account(serverResponse, loginless, socket)
    })
  }

  return client
}