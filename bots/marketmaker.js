var bluebird = require('bluebird')

var mmbot = bluebird.coroutine(function* mmBot(baseurl, privateKey, side) {
  var PusherClient = require('pusher-client')
  var mangler = require('mangler')
  var cc           = require("../src/index")(baseurl)
  var account      = yield cc.getAccount(privateKey)
  var pusherClient = new PusherClient('de504dc5763aeef9ff52')
  var channel      = pusherClient.subscribe('live_trades')
  var lastPrice
  var PRICE_ADD = {buy : -0.1, sell : 0.1}
  channel.bind('trade', bluebird.coroutine(function*(data) {
    var price = account.fixedPrice(data.price)
    console.log(price)
    if (price !== lastPrice)
      yield* marketMoved(price)
  }))

  function* marketMoved(price) {
    lastPrice = price
    console.log("price", price)
    var openOrders = account.getOpenOrders()
    for (var i = 0; i < openOrders.length; i++) {
      var order = openOrders[i];
      if (order.side === side && order.orderType === 'LMT') {
        yield* updateOrder(order, price)
        return
      }
    }
    yield* createOrder(side, price)
  }

  function* createOrder(side, price) {
    yield account.createOrders(
      [
        {
          clientid   : account.newUUID(),
          userid     : account.userid,
          side       : side,
          quantity   : 1,
          price      : mangler.fixed(price + PRICE_ADD[side]),
          orderType  : 'LMT',
          stopPrice  : 10,
          targetPrice: 0.0
        }
      ])
  }

  function* updateOrder(order, price){
    order.price = mangler.fixed(price + PRICE_ADD[side])
    yield account.updateOrders([order])
  }
  
  setInterval(bluebird.coroutine(function*(){
    try {
      yield* marketMoved(mangler.numberBetween(500, 550))
    } catch (e) {
      console.log(e)
    }
  }), 5000)
})

mmbot("http://localhost:9000", "cSP5d6rBPRaUBRjRgGtVghHAD6aCGgFAoXVjhUwRxNzqKECNwj4a", "buy")
