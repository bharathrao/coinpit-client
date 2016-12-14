module.exports = (function () {
  var socket   = {}
  var eventMap = {}

  socket.removeListener = function () {
  }
  socket.on = function (event, fn) {
    eventMap[event] = fn
  }

  socket.respond = function(event, response){
    eventMap[event](response)
  }
  socket.emit = function(){

  }
  return socket
})()
