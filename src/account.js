module.exports = function (serverResponse, loginless, socket) {
  var bluebird    = require('bluebird')
  var nodeUUID    = require('node-uuid')
  var util        = require('./util')
  var account     = {}
  var openOrders = {}, positions, pnl, availableMargin, readonlyApp, ioconnected
  var validator   = require("./validator")(serverResponse.instrument)
  var promises    = {}
  account.logging = false

  var eventMap = {
    // version         : onVersion,
    trade           : onTrade,
    // orderbook       : onOrderBook,
    // difforderbook   : onDiffOrderBook,
    // config          : onConfig,
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
    return util.clone(openOrders)
  }

  account.createOrder = function (order) {
    validator.validateCreateOrder(order)
    return promised({ orders: [order] }, "POST", "order-post")
  }

  account.updateOrder = function (order) {
    validator.validateUpdateOrder(order, orders)
    return promised({ orders: [order] }, "PUT", "order-put")
  }

  account.cancelOrder = function (order) {
    return promised({ uuid: order.uuid }, "DELETE", "order-del")
  }

  account.flat = function () {
    return promised({}, "DELETE", "orders-del")
  }

  account.transferToMargin = function () {
    
  }

  account.balance = function () {

  }

  account.withdraw = function () {

  }

  account.recoveryTx = function () {

  }

  account.closeAll = function () {

  }

  account.clearMargin = function () {

  }

  account.getUserDetails = function () {
    return loginless.rest.get("/api/userdetails").then(refreshWithUserDetails).catch(handleError)
  }

  function onReadOnly(status) {
    if (readonlyApp == status.readonly) return
    if(status.readonly) return readonlyApp = status.readonly
    loginless.socket.register(socket)
    getUserDetails().then(function(){
      readonlyApp = status.readonly
    })
  }

  function onConnect(message) {
    if (!ioconnected) {
      ioconnected = true
      loginless.socket.register(socket)
      getUserDetails()
    }
  }

  function onDisconnect() {
    ioconnected = false
  }

  function onAuthError(message) {
    loginless.socket.onAuthError(socket, message)
  }

  function onOrderAdd(orders) {
    updateOrders(orders)
    var response = getCustomerResponse(orders)
    respondSuccess(orders.requestid, response[0])
  }

  function onOrderUpdate(orders) {
    onOrderAdd(orders)
  }

  function onOrderDel(response) {
    delete orders[response.uuid]
    respondSuccess(response.requestid, response.uuid)
  }

  function onFlat(response) {
    getUserDetails().then(function () {
      respondSuccess(response.requestid, openOrders)
    })
  }

  function onError(response) {
    respondError(response.requestid, response.error.error)
    if (!response.requestid) {
      //todo: this needs to be handled
      handleError("Error on error", response.error.error)
    }
  }

  function myMessageReceived(message) {
    if (account.logging) console.log("myMessageReceived: ", message)
    if (message.error) {
      handleError(message.error)
    }
    refreshWithUserDetails(message.userDetails)
    notifyLastTick()
    redraw()
  }

  function onTrade(trade) {
    if (!isAppVisible) return
    chart.updateChart(trade)
    currentPriceUpdated()
    notifyLastTick()
  }

  function promised(body, method, uri) {
    return new bluebird(function (resolve, reject) {
      body.requestid           = nodeUUID.v1()
      promises[body.requestid] = { resolve: resolve, reject: reject, time: Date.now() }
      loginless.socket.send(socket, body, method, uri)
    })
  }

  function updateOrders(orders) {
    for (var i = 0; i < orders.length; i++) {
      var order              = orders[i];
      openOrders[order.uuid] = order
    }
  }

  function getCustomerResponse(orders) {
    return orders.map(function (order) {
      return util.clone(order)
    })
  }

  function respondSuccess(requestid, response) {
    respond(requestid, response, 'resolve')
  }

  function respondError(requestid, response) {
    respond(requestid, response, 'reject')
  }

  function respond(requestid, response, method) {
    if (!requestid) return
    promises[requestid][method](response)
    delete promises[requestid]
  }

  function handleError() {
    if (account.logging) console.log(arguments)
  }

  function refreshWithUserDetails(userDetails) {
    openOrders      = userDetails.orders
    positions       = userDetails.positions
    pnl             = userDetails.pnl
    availableMargin = userDetails.availableMargin
  }

  return account
}