module.exports = function (serverResponse, loginless, socket) {
  var bluebird       = require('bluebird')
  var nodeUUID       = require('node-uuid')
  var assert         = require('affirm.js')
  var _              = require('lodash')
  var mangler        = require('mangler')
  var account        = {}
  account.openOrders = {}
  var positions, pnl, availableMargin, readonlyApp, ioconnected
  var bidAsk         = {}
  account.config     = serverResponse.config
  var validator      = require("./validator")(serverResponse.instrument)
  var promises       = {}
  account.logging    = false

  var eventMap = {
    // version         : onVersion,
    trade           : onTrade,
    orderbook       : onOrderBook,
    difforderbook   : onDiffOrderBook,
    config          : onConfig,
    readonly        : onReadOnly,
    // advisory        : onAdvisory,
    reconnect       : onConnect,
    connect_error   : onDisconnect,
    connect_timeout : onDisconnect,
    reconnect_error : onDisconnect,
    reconnect_failed: onDisconnect,
    order_add       : onOrderAdd,
    order_del       : onOrderDel,
    order_error     : onError,
    orders_del      : onFlat,
    order_update    : onOrderUpdate,
    user_message    : myMessageReceived,
    ntp             : loginless.socket.ntp.bind(loginless.socket),
    auth_error      : onAuthError
  }

  Object.keys(eventMap).forEach(function (event) {
    socket.removeListener(event, eventMap[event])
    socket.on(event, eventMap[event])

  })

  account.getOpenOrders = function () {
    return Object.keys(account.openOrders).map(function(uuid){
      return _.cloneDeep(account.openOrders[uuid])
    })
  }

  account.createOrders = function (orders) {
    console.log('create order', orders[0].price, orders[0].side, orders[0].orderType)
    validator.validateCreateOrder(orders)
    return promised(orders, "POST", "/order")
  }

  account.updateOrders = function (orders) {
    console.log('update order', orders[0].price, orders[0].side, orders[0].orderType, orders[0].uuid, orders.length)
    validator.validateUpdateOrder(orders, account.openOrders)
    return promised({orders:orders}, "PUT", "/order")
  }

  account.cancelOrder = function (order) {
    return promised([order.uuid], "DELETE", "/order")
  }

  account.closeAll = function () {
    return promised([], "DELETE", "/order")
  }

  account.transferToMargin = function (amountInBTC) {

  }

  account.getBidAks = function () {
    return bidAsk
  }

  account.getAvailableMargin = function () {
    return availableMargin
  }

  account.balance = function () {
    /*{
     balance:multisig-balance + margin-balance + pnl,
     availableMargin:userDetail.margin,
     multisig :{confirmed, unconfirmed},
     margin :{confirmed, unconfirmed}
     }*/

  }

  account.withdraw = function (address, amount, commission) {

  }

  account.recoveryTx = function () {

  }

  account.clearMargin = function () {

  }

  account.getUserDetails = function () {
    return loginless.rest.get("/api/userdetails").then(refreshWithUserDetails).catch(handleError)
  }

  account.fixedPrice = function (price) {
    assert(price, 'Invalid Price:' + price)
    return price.toFixed(account.config.instrument.ticksize) - 0
  }

  account.newUUID = function () {
    return nodeUUID.v4()
  }

  function onReadOnly(status) {
    if (readonlyApp == status.readonly) return
    if (status.readonly) return readonlyApp = status.readonly
    loginless.socket.register(socket)
    account.getUserDetails().then(function () {
      readonlyApp = status.readonly
    })
  }

  function onConnect(message) {
    if (!ioconnected) {
      ioconnected = true
      loginless.socket.register(socket)
      account.getUserDetails()
    }
  }

  function onDisconnect() {
    ioconnected = false
  }

  function onAuthError(message) {
    loginless.socket.onAuthError(socket, message)
  }

  function onOrderAdd(response) {
    updateOrders(response.result)
    respondSuccess(response.requestid, _.cloneDeep(response.result))
  }

  function onOrderUpdate(response) {
    onOrderAdd(response)
  }

  function onOrderDel(response) {
    delete account.openOrders[response.result[0]]
    respondSuccess(response.requestid, response.result[0])
  }

  function onFlat(response) {
    account.getUserDetails().then(function () {
      respondSuccess(response.requestid, _.cloneDeep(account.openOrders))
    })
  }

  function onError(response) {
    respondError(response.requestid, response.error)
    refreshWithUserDetails(response.userDetails)
    if (!response.requestid) {
      //todo: this needs to be handled
      handleError("Error without requestid", response.error)
    }
  }

  function myMessageReceived(message) {
    if (account.logging) console.log("myMessageReceived: ", message)
    if (message.error) {
      handleError(message.error)
    }
    refreshWithUserDetails(message.userDetails)
  }

  function onTrade(trade) {
    console.log('trades', trade)

  }

  function promised(body, method, uri) {
    return new bluebird(function (resolve, reject) {
      var requestid       = nodeUUID.v1()
      promises[requestid] = { resolve: resolve, reject: reject, time: Date.now() }
      loginless.socket.send(socket, method, uri, { requestid: requestid }, body)
    })
  }

  function updateOrders(orders) {
    for (var i = 0; i < orders.length; i++) {
      var order                      = orders[i];
      account.openOrders[order.uuid] = order
    }
  }

  function onOrderBook(data) {
    bidAsk = {
      bid: data.bid,
      ask: data.ask
    }
  }

  function onDiffOrderBook(diffOrderBook) {
    onOrderBook(diffOrderBook)
  }

  function onConfig(config) {
    account.config = config
  }

  function getCustomerResponse(orders) {
    return orders.map(function (order) {
      return _.cloneDeep(order)
    })
  }

  function respondSuccess(requestid, response) {
    respond(requestid, response, 'resolve')
  }

  function respondError(requestid, response) {
    respond(requestid, response, 'reject')
  }

  function respond(requestid, response, method) {
    if (!requestid || !promises[requestid]) return
    promises[requestid][method](response)
    delete promises[requestid]
  }

  function handleError() {
    if (account.logging) console.log(arguments)
  }

  function refreshWithUserDetails(userDetails) {
    account.openOrders = mangler.mapify(userDetails.orders, 'uuid')
    positions          = userDetails.positions
    pnl                = userDetails.pnl
    availableMargin    = userDetails.margin
  }

  Object.keys(loginless.getAccount()).forEach(function (key) {
    account[key] = loginless.getAccount()[key]
  })

  return account
}