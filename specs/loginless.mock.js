module.exports = function (event, result) {
  var loginless    = {}
  loginless.socket = {
    ntp : function () {
    },
    send: function (socket, method, uri, headers, body) {
      socket.respond(event, { result: result, requestid: headers.requestid })
    }
  }
  loginless.getAccount = function () {
    return {}
  }
  return loginless
}