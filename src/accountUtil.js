var affirm = require('affirm.js')

module.exports = (function () {
  var accUtil    = {}
  var marginSide = { "buy": -1, "sell": 1 }

  accUtil.computeAvailableMarginCoverage = function (orders, profitAndLoss, instrument, availableMargin) {
    affirm(orders && Array.isArray(orders), 'Orders array of size >= 0 required')
    affirm(!profitAndLoss || (typeof profitAndLoss.pnl === 'number'), 'invalid Profit and loss ' + JSON.stringify(profitAndLoss))
    affirm(typeof availableMargin === 'number', 'Invalid margin balance' + availableMargin)
    affirm(instrument, 'Instrument not specified for computing margin')

    var marginPointsUsedByOrders = 0
    orders.forEach(function (order) {
      marginPointsUsedByOrders += accUtil.getMarginPointsUsedByOrder(order, instrument)
    })
    availableMargin -= marginPointsUsedByOrders * instrument.ticksperpoint * instrument.tickvalue
    availableMargin += profitAndLoss && profitAndLoss.pnl || 0
    return Math.round(availableMargin)
  }

  accUtil.getMarginPointsUsedByOrder = function (order, instrument) {
    if (order.orderType === "TGT")  return 0

    var quantity = order.quantity - (order.filled || 0) - (order.cancelled || 0)
    var cushion  = order.cushion || instrument.stopcushion

    if (order.orderType === "STP") {
      var entryAmount = order.entryAmount || order.executionPrice * quantity
      // var executionPrice    = order.executionPrice
      var exitAmount = order.price * quantity
      return marginSide[order.side] * (entryAmount - exitAmount) + cushion * quantity
    }

    return quantity * (order.stopPrice + cushion )
  }

  return accUtil
})()
