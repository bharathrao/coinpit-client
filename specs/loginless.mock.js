var socket     = require("./socket.mock")
module.exports = function (event, result) {
  var loginless         = {}
  loginless.socket      = socket
  loginless.socket.ntp  = function () {
  }
  loginless.socket.send = function (request) {
    socket.respond(event, { result: result, requestid: request.headers.requestid })
  }

  loginless.account = {}
  return loginless
}