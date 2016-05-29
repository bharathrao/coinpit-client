var bluebird = require('bluebird')

bluebird.coroutine(function*(baseurl, privkey, throttleTime, bias) {
  return
  process.env.COINPIT_URL = baseurl
  var cc = require('../src/index')(baseurl)
  var account = yield cc.getAccount(privkey)
  
  
  bias                    = bias - 0
  var AVLTree             = require('binary-search-tree').AVLTree;
  $CONFIG                 = (yield (require("rest.js").get(baseurl + "/api/config"))).body
  var PusherClient        = require('pusher-client')
  var util                = require('util')
  var caseless            = require('caseless')
  var pusherClient        = new PusherClient('de504dc5763aeef9ff52')
  var channel             = pusherClient.subscribe('diff_order_book')
  var socket              = require("socket.io-client")
  var loginless           = require("loginless")(baseurl, "/api/auth/", $CONFIG.network, console.log.bind(console))
  var assert              = require("assert")
  var availableMargin
  var isReadOnly

//================================var functions===============================
  var myMessageReceived = bluebird.coroutine(function *(message) {
    try {
      if (message.error) {
        console.log(message.error.error)
        return
      }
      userdetails = message.userDetails
      assert(userdetails.orders, "orders not found in userdetails" + JSON.stringify(userdetails))
      updateOrderCache(userdetails.orders)
      availableMargin = userdetails.margin
    } catch (e) {
      console.log(e)
      console.log(e.stack)
    }
  })

  var updateUserDetails = bluebird.coroutine(function*(message) {
    var userDetails = yield* getUserDetails()
    assert(userDetails.orders, "orders not found in userdetails" + JSON.stringify(userDetails))
    myMessageReceived({ userDetails: userDetails })
  })

//================================logic=======================================

  var userOrders
  var meData          = yield loginless.getServerKey(privkey)
  var instrument      = meData.instrument
  var serverPublicKey = meData.serverPublicKey
  var io              = socket(baseurl, { rejectUnauthorized: true })

  var sideSign   = { buy: 1, sell: -1 }
  var orderTypes = { 1: "MKT", 2: "STM", 3: "SLM" }
  var bidsdata
  var asksdata

  if (!serverPublicKey) {
    util.log('No publicKey from server. Exiting')
    return
  }

  loginless.socket.register(io)
  var userdetails = yield* getUserDetails()

  availableMargin = userdetails.margin
  updateOrderCache(userdetails.orders)

  setInterval(bluebird.coroutine(function*() {
    if (isReadOnly) return
    if (bidsdata) {
      var data = bidsdata
      bidsdata = undefined
      yield* createOrders(data, "buy")
    }
    if (asksdata) {
      data     = asksdata
      asksdata = undefined
      yield* createOrders(data, "sell")
    }
  }), throttleTime)

  channel.bind('data', bluebird.coroutine(function*(data) {
    bidsdata = data.bids
    asksdata = data.asks
  }))

  var eventMap = {
    config      : onConfig,
    readonly    : onReadOnly,
    order_add   : updateUserDetails,
    order_del   : updateUserDetails,
    order_error : onError,
    orders_del  : updateUserDetails,
    order_update: updateUserDetails,
    user_message: myMessageReceived,
    ntp         : loginless.socket.ntp.bind(loginless.socket),
    auth_error  : onAuthError
  }
  Object.keys(eventMap).forEach(event => io.on(event, eventMap[event]))

//================================functions=======================================

  function updateOrderCache(orders) {
    assert(orders, "orders not found")
    userOrders = {
      buy      : new AVLTree({ compareKeys: buyOrderCompare }),
      buyCount : 0,
      sell     : new AVLTree({ compareKeys: sellOrderCompare }),
      sellCount: 0
    }
    orders.forEach(order => {
      userOrders[order.side].insert(order.price, order)
      userOrders[order.side + "Count"]++
    })
  }

  /*
   [LMT-7 STM-1 SLM-1 MKT-1]  [UPDATE-5 DELETE-5]
   */
  function* createOrders(simulatedOrders, side) {
    if (!isMarginSufficient()) {
      yield* trimOrder()
      return
    }
    for (var i = 0; i < simulatedOrders.length; i++) {
      var order    = simulatedOrders[i];
      var fixed    = (order[1] - 0).toFixed(0) - 0
      var quantity = fixed % 3
      var price    = orderPrice(order[0])
      if (quantity === 0) {
        yield* deleteOrder(side, price)
        continue
      }
      if (userOrders[side].search(price)[0]) continue
      var newOrder = createOrders(price, quantity, side)
      //console.log("newOrder", order, newOrder)
      try {
        loginless.socket.send(io, [newOrder], "POST", "order-post")
      } catch (e) {
        util.log(e)
        util.log(e.stack)
      }
      break
    }
  }

  function createOrder(price, quantity, side) {
    var orderType = orderTypes[numberBetween(1, 20)] || "LMT"
    price         = orderType === "MKT" ? undefined : price
    var stop      = numberBetween(2, 10)
    console.log("stop", stop)
    return { "side": side, orderType: orderType, "quantity": quantity, "price": price, "stopPrice": stop, "targetPrice": stop }
  }

  function* trimOrder() {
    var side = userOrders.buyCount > userOrders.sellCount ? "buy" : "sell"
    yield* deleteOrder(side, userOrders[side].tree.getMaxKey())
  }

  function* deleteOrder(side, price) {
    var order = userOrders[side].search(price)[0]
    if (!order) return
    var update = numberBetween(0, 1) === 0
    try {
      if (update) {
        order.price += sideSign[order.side] * 0.1
        loginless.socket.send(io, { changedOrders: [order] }, "PUT", "order-put")
      } else {
        loginless.socket.send(io, order.uuid, "DELETE", "order-del")
        userOrders[order.side + "Count"]--
        userOrders[order.side].delete(order.price)
      }
    } catch (e) {
      util.log(e)
      util.log(e.stack)
    }
  }

  function onConfig(config) {
    $CONFIG = config ? config : $CONFIG
  }

  function onReadOnly(message) {
    isReadOnly = message.readonly
  }

  function onAuthError(message) {
    loginless.socket.onAuthError(io, message)
  }

  function onError(message) {
    console.log(message.error.error)
    myMessageReceived({ userDetails: message.userDetails })
  }

  function* getUserDetails() {
    return yield loginless.rest.get("/api/userdetails")
  }

  function isMarginSufficient() {
    return availableMargin - 2 * instrument.margin - $CONFIG.minimumFee > 0
  }

  function orderPrice(pricestring) {
    return (pricestring - 0 + bias - 0 ).toFixed(instrument.ticksize) - 0
  }

  function sellOrderCompare(a, b) {
    return a == b ? 0 : ( a < b ? -1 : 1 );
  }

  function buyOrderCompare(a, b) {
    return a == b ? 0 : ( a > b ? -1 : 1 );
  }

  function numberBetween(start, end) {
    return Math.round(Math.random() * (end - start)) + start
  }

})(process.env.COINPIT_URL || "http://localhost:9000", process.env.PRIVATE_KEY, process.env.THROTTLE_TIME || 5000, process.env.BIAS || 0)
