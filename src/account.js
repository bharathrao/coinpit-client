module.exports = function (loginless, configs) {
  var bluebird    = require('bluebird')
  var nodeUUID    = require('uuid')
  var assert      = require('affirm.js')
  var _           = require('lodash')
  var mangler     = require('mangler')
  var util        = require('util')
  var InsightUtil = require('insight-util')
  var accountUtil = require('./accountUtil')
  var bitcoinutil = require("bitcoinutil")
  var txutil      = require('./txutil')
  var account     = {}
  var positions, pnl, availableMargin, readonlyApp, ioconnected
  var bidAsk      = {}

  var promises        = {}
  var band            = {}
  account.loginless   = loginless
  account.config      = configs.config
  account.instruments = configs.instruments
  account.insightUtil = InsightUtil(account.config.blockchainapi.uri)
  var instruments     = require('./instruments').init(account.instruments)
  var validator       = require("./validator")
  account.openOrders  = {}
  account.logging     = false

  var multisigBalance, marginBalance

  account.getOpenOrders = function () {
    return _.cloneDeep(account.openOrders)
  }

  account.getInstruments = function () {
    return account.instruments
  }

  account.getBidAsk = function () {
    return bidAsk
  }

  account.getIndexBands = function () {
    return band
  }

  account.getBalance = function () {
    return {
      balance        : multisigBalance.balance + marginBalance.balance + (pnl ? pnl.pnl : 0),
      availableMargin: availableMargin,
      multisig       : _.cloneDeep(multisigBalance),
      margin         : _.cloneDeep(marginBalance)
    }
  }

  account.patchOrders = function (symbol, patch) {
    var payload = []
    patch.cancels && patch.cancels.forEach(function (cancel) {
      payload.push({ op: 'remove', path: '/' + cancel.uuid })
    })
    if (patch.updates && patch.updates.length > 0) {
      payload.push({ op: 'replace', path: "", value: { orders: patch.updates } })
    }
    if (patch.creates && patch.creates.length > 0) {
      payload.push({ op: 'add', path: "", value: patch.creates })
    }
    if (patch.merge && patch.merge.length > 0) {
      payload.push({ op: 'merge', path: "", from: patch.merge })
    }
    if (patch.split && patch.split.length > 0) {
      payload.push({ op: 'split', path: "", from: patch.uuid, quantity: patch.quantity })
    }

    if (payload.length === 0) return emptyPromise()
    return promised(symbol, payload, "PATCH", "/order", function () {
      logPatch(payload)
      if (patch.creates) validator.validateCreateOrder(account.instruments, patch.creates)
      if (patch.updates) validator.validateUpdateOrder(account.instruments, patch.updates, account.openOrders)
    })
  }

  account.createOrders = function (symbol, orders) {
    return promised(symbol, orders, "POST", "/order", function () {
      logOrders(orders)
      validator.validateCreateOrder(account.instruments, orders)
      account.assertAvailableMargin(orders)
    })
  }

  account.updateOrders = function (symbol, orders) {
    return promised(symbol, { orders: orders }, "PUT", "/order", function () {
      logOrders(orders)
      validator.validateUpdateOrder(account.instruments, orders, account.openOrders)
      account.assertAvailableMargin(orders)
    })
  }

  account.cancelOrder = function (symbol, order) {
    return promised(symbol, [order.uuid], "DELETE", "/order")
  }

  account.cancelOrders = function (orders) {
    return bluebird.all(orders.map(function (order) {
      return account.cancelOrder(order)
    }))
  }

  account.closeAll = function (symbol) {
    return promised(symbol, [], "DELETE", "/order")
  }

  account.getClosedOrders = function (symbol, uuid) {  //todo: needs rest call
    return loginless.rest.get("/contract/" + symbol + "/order/closed/" + (uuid ? uuid : ""))
  }

  account.transferToMargin = function (amountInSatoshi, feeInclusive) {
    return account.insightUtil.getConfirmedUnspents(multisigBalance.address).then(function (confirmedUnspents) {
      var tx     = txutil.createTx(
        {
          input       : multisigBalance.address,
          destination : marginBalance.address,
          amount      : amountInSatoshi,
          unspents    : confirmedUnspents,
          isMultisig  : true,
          network     : account.config.network,
          feeInclusive: feeInclusive
        })
      var signed = bitcoinutil.sign(tx, account.userPrivateKey, account.redeem, true)
      return loginless.rest.post('/margin', { requestid: nodeUUID.v4() }, [{ txs: [signed] }])
    })
  }

  account.withdraw = function (address, amountSatoshi, feeSatoshi) {
    return account.insightUtil.getConfirmedUnspents(account.accountid).then(function (unspents) {
      var amount   = Math.floor(amountSatoshi)
      var fee      = Math.floor(feeSatoshi)
      var tx       = txutil.createTx({ input: account.accountid, isMultisig: true, amount: amount, destination: address, unspents: unspents, txFee: fee })
      var signedTx = bitcoinutil.sign(tx, account.userPrivateKey, account.redeem, true)
      return loginless.rest.post('/tx', {}, { tx: signedTx })
    })
  }

  account.recoveryTx = function () {
    return loginless.rest.get('/withdrawtx').then(function (withdraw) {
      return bitcoinutil.sign(withdraw.tx, account.userPrivateKey, account.redeem)
    }).catch(handleError)
  }

  account.clearMargin = function () {
    return loginless.rest.del("/margin").catch(handleError)
  }

  account.updateAccountBalance = function () {
    return bluebird.all([account.insightUtil.getAddress(account.serverAddress), account.insightUtil.getAddress(account.accountid)])
      .then(function (balances) {
        addressListener(balances[0])
        addressListener(balances[1])
      })
  }

  account.getUserDetails = function () {
    return loginless.rest.get("/account").then(refreshWithUserDetails).catch(handleError)
  }

  account.getPositions = function () {
    return _.cloneDeep(positions)
  }

  account.getPnl = function () {
    return _.cloneDeep(pnl)
  }

  account.fixedPrice = function (symbol, price) {
    assert(price, 'Invalid Price:' + price)
    return price.toFixed(instrument(symbol).ticksize) - 0
  }

  account.newUUID = function () {
    return nodeUUID.v4()
  }

  account.getPriceBand = function (symbol) {
    return band[symbol]
  }

  function onReadOnly(status) {
    try {
      if (readonlyApp == status.readonly) return
      if (status.readonly) return readonlyApp = status.readonly
      loginless.socket.register()
      account.getUserDetails().then(function () {
        readonlyApp = status.readonly
      })
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onConnect(message) {
    try {
      if (!ioconnected) {
        ioconnected = true
        loginless.socket.register()
        account.getUserDetails()
      }
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onDisconnect() {
    ioconnected = false
  }

  function onAuthError(message) {
    try {
      loginless.socket.onAuthError(message)
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  var PATCH_HANDLER = {
    remove : removeOrders,
    replace: updateOrders,
    add    : updateOrders,
    merge  : onOrderMerge,
    split  : updateOrders
  }

  function removeOrders(response) {
    removeOrdersFromCache(response)
    availableMargin = account.calculateAvailableMargin(account.getOpenOrders())
  }

  function onOrderMerge(response) {
    removeOrdersFromCache(response.removed)
    response.added.forEach(function (added) {
      account.openOrders[added.instrument]             = account.openOrders[added.instrument] || {}
      account.openOrders[added.instrument][added.uuid] = added
    })
  }

  function removeOrdersFromCache(uuids) {
    Object.keys(account.openOrders).forEach(function (orders) {
      uuids.forEach(function (uuid) {
        delete orders[uuid]
      })
    })
  }

  function onOrderPatch(response) {
    try {
      var result = response.result
      result.forEach(function (eachResponse) {
        if (eachResponse.error) return console.log('could not complete the request ', eachResponse)
        if (PATCH_HANDLER[eachResponse.op]) PATCH_HANDLER[eachResponse.op](eachResponse.response)
        else console.log('eachResponse.op not found ', eachResponse.op, eachResponse)
      })
      respondSuccess(response.requestid, _.cloneDeep(response.result))
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onOrderAdd(response) {
    try {
      updateOrders(response.result)
      respondSuccess(response.requestid, _.cloneDeep(response.result))
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onOrderUpdate(response) {
    onOrderAdd(response)
  }

  function onOrderDel(response) {
    try {
      removeOrdersFromCache(response.result)
      availableMargin = account.calculateAvailableMargin(account.getOpenOrders())
      respondSuccess(response.requestid, response.result)
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onFlat(response) {
    try {
      account.getUserDetails().then(function () {
        respondSuccess(response.requestid, _.cloneDeep(account.openOrders))
      })
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onError(response) {
    try {
      respondError(response.requestid, response.error)
      refreshWithUserDetails(response.userDetails)
      if (!response.requestid) {
        //todo: this needs to be handled
        handleError("Error without requestid", response.error)
      }
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onUserMessage(message) {
    try {
      if (account.logging) util.log(Date.now(), "user details refreshed ")
      if (message.error) {
        handleError(message.error)
      }
      refreshWithUserDetails(message.userDetails)
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onTrade(trade) {
    // util.log('Date.now(), trades', trade)

  }

  function promised(symbol, body, method, uri, fn) {
    var requestid = nodeUUID.v4()
    return new bluebird(function (resolve, reject) {
      if (fn) {
        try {
          fn()
        } catch (e) {
          reject(e)
          return
        }
      }
      try {
        promises[requestid] = { resolve: resolve, reject: reject, time: Date.now() }
        loginless.socket.send({ method: method, uri: uri, headers: { requestid: requestid }, body: body, params: { instrument: symbol } })
      } catch (e) {
        onError({ requestid: requestid, error: e })
      }
    })
  }

  function updateOrders(orders) {
    for (var i = 0; i < orders.length; i++) {
      account.openOrders[orders[i].instrument]                 = account.openOrders[orders[i].instrument] || {}
      account.openOrders[orders[i].instrument][orders[i].uuid] = orders[i]
    }
    availableMargin = account.calculateAvailableMarginIfCrossShifted(account.getOpenOrders())
  }

  function onOrderBook(data) {
    try {
      var symbols = Object.keys(data)
      for (var i = 0; i < symbols.length; i++) {
        var symbol     = symbols[i];
        bidAsk[symbol] = {
          bid: data[symbol].bid,
          ask: data[symbol].ask
        }
      }
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onDiffOrderBook(diffOrderBook) {
    try {
      onOrderBook(diffOrderBook)
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function onConfig(config) {
    account.config = config
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
    if (account.logging) util.log(Date.now(), arguments)
  }

  function refreshWithUserDetails(userDetails) {
    if (!userDetails) return
    account.openOrders = userDetails.orders
    positions          = userDetails.positions
    pnl                = userDetails.pnl
    availableMargin    = userDetails.margin
  }

  account.assertAvailableMargin = function (orders) {
    var margin = account.getPostAvailableMargin(orders)
    assert(margin >= 0, "Insufficient margin ", margin, ".add margin")
  }

  account.getPostAvailableMargin = function (orders) {
    var ordersMap = getOpenOrdersIfSuccess(orders)
    return account.calculateAvailableMarginIfCrossShifted(ordersMap)
  }

  function getOpenOrdersIfSuccess(orders) {
    var ordersMap = _.cloneDeep(account.openOrders)
    for (var i = 0; i < orders.length; i++) {
      var order                         = orders[i];
      var uuid                          = order.uuid || nodeUUID.v4()
      ordersMap[order.instrument]       = ordersMap[order.instrument] || {}
      ordersMap[order.instrument][uuid] = order
    }
    return ordersMap
  }

  account.calculateAvailableMargin = function (orders) {
    return accountUtil.computeAvailableMarginCoverage(orders, pnl, marginBalance.balance, band)
  }

  account.calculateAvailableMarginIfCrossShifted = function (orders) {
    return accountUtil.computeAvailableMarginCoverageIfCrossShifted(orders, pnl, marginBalance.balance, band)
  }

  account.getMaxMargin = function () {
    return account.calculateAvailableMarginIfCrossShifted(account.getOpenOrders())
  }

  function logPatch(payload) {
    if (!account.logging) return
    util.log(Date.now(), JSON.stringify(payload, null, -2))
  }

  function logOrders(orders) {
    if (!account.logging) return
    orders.forEach(function (order) {
      util.log(Date.now(), order.uuid ? "update" : "create", "uuid", order.uuid, "price", order.price, "side", order.side, "type", order.orderType)
    })
  }

  function copyFromLoginlessAccount() {
    Object.keys(loginless.account).forEach(function (key) {
      account[key] = loginless.account[key]
    })
  }

  function setupSocketEvents() {
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
      order_patch     : onOrderPatch,
      account         : onUserMessage,
      auth_error      : onAuthError,
      priceband       : onPriceBand,
      instruments     : updateInstruments
    }

    Object.keys(eventMap).forEach(function (event) {
      loginless.socket.removeListener(event, eventMap[event])
      loginless.socket.on(event, eventMap[event])

    })
    loginless.socket.emit('GET /state', "")
  }

  function updateInstruments(instrumentConfigs) {
    account.instruments = instrumentConfigs
    instruments         = require('./instruments').init(account.instruments)
    return account.getUserDetails()
  }

  function addressListener(addressInfo) {
    switch (addressInfo.address) {
      case account.accountid:
        // if (myConfirmedBalance !== addressInfo.confirmed) adjustMarginSequentially()
        multisigBalance = addressInfo
        break;
      case account.serverAddress:
        marginBalance = addressInfo
        break
      default:
        account.insightUtil.unsubscribe(addressInfo.address)
    }
  }

  function onPriceBand(priceBand) {
    band = priceBand
  }

  function init() {
    setupSocketEvents()
    copyFromLoginlessAccount()
    account.insightUtil.subscribe(account.accountid, addressListener)
    account.insightUtil.subscribe(account.serverAddress, addressListener)
    setInterval(timeoutPromises, 1000)
  }

  function emptyPromise() {
    return new bluebird(function (resolve, reject) {
      return resolve()
    })
  }

  function timeoutPromises() {
    try {
      Object.keys(promises).forEach(function (requestid) {
        var promise = promises[requestid]
        if ((Date.now() - promise.time) > 10000){
          onError({ requestid: requestid, error: 'Request Timed Out for ' + requestid })
          util.log('timeoutPromises: promise removed for' , requestid , 'after ', (Date.now() - promise.time), 'ms')
        }
      })
    } catch (e) {
      util.log('ERROR: timeout promises', e.stack)
    }
  }

  init()
  return account
}
