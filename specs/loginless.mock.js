module.exports = function(event, result){
  var loginless = {}
  loginless.socket = {
    ntp: function(){},
    send: function(socket, body, method, uri){
      result.requestid = body.requestid
      socket.respond(event, result)
    }
  }
  return loginless
}