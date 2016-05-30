module.exports = function (coinpitUrl) {
  var socket    = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var rest = require('rest.js')
  var account = require("./account")
  var client  = {}

  client.getAccount = function (privKey) {
    return rest.get(coinpitUrl + '/api/config').then(function(response){
      var config = response.body
      var loginless = require("loginless")(coinpitUrl, "/api/auth/", config.network, console.log.bind(console))
      return loginless.getServerKey(privKey).then(function (serverResponse) {
        loginless.socket.register(socket)
        return account(serverResponse, loginless, socket)
      }).then(function(acc){
        return acc.getUserDetails().then(function(){
          return acc
        })
      })
    })
  }

  return client
}