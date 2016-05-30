module.exports = function (event, result) {
  var loginless    = {}
  loginless.socket = {
    ntp : function () {
    },
    send: function (socket, method, headers, uri, body) {
      socket.respond(event, { result: result, requestid: headers.requestid })
    }
  }
  return loginless
}