module.exports = function (serverResponse, loginless, socket) {
  var bluebird    = require('bluebird')
  var nodeUUID    = require('node-uuid')
  var util        = require('./util')
  var account     = {}
  account.openOrders = {}
  var positions, pnl, availableMargin, readonlyApp, ioconnected
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
    return util.clone(account.openOrders)
  }

  account.createOrders = function (orders) {
    validator.validateCreateOrder(orders)
    return promised(orders, "POST", "/order")
  }

  account.updateOrders = function (orders) {
    validator.validateUpdateOrder(orders, account.openOrders)
    return promised([orders], "PUT", "/order")
  }

  account.cancelOrder = function (order) {
    return promised([order.uuid], "DELETE", "/order")
  }

  account.closeAll = function () {
    return promised([], "DELETE", "/order")
  }

  account.transferToMargin = function (amountInBTC) {
    
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

  function onOrderAdd(response) {
    updateOrders(response.result)
    respondSuccess(response.requestid, util.clone(response.result))
  }

  function onOrderUpdate(response) {
    onOrderAdd(response)
  }

  function onOrderDel(response) {
    delete orders[response.result[0]]
    respondSuccess(response.requestid, response.result[0])
  }

  function onFlat(response) {
    getUserDetails().then(function () {
      respondSuccess(response.requestid, util.clone(account.openOrders))
    })
  }

  function onError(response) {
    respondError(response.requestid, response.error)
    if (!response.requestid) {
      //todo: this needs to be handled
      handleError("Error on error", response.error)
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
      var requestid           = nodeUUID.v1()
      promises[requestid] = { resolve: resolve, reject: reject, time: Date.now() }
      loginless.socket.send(socket, method, {requestid: requestid}, uri, body)
    })
  }

  function updateOrders(orders) {
    for (var i = 0; i < orders.length; i++) {
      var order              = orders[i];
      account.openOrders[order.uuid] = order
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
    account.openOrders      = userDetails.orders
    positions       = userDetails.positions
    pnl             = userDetails.pnl
    availableMargin = userDetails.availableMargin
  }

  return account
}