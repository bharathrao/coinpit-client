var affirm     = require('affirm.js')
var mangler    = require('mangler')
module.exports = (function () {
  var accUtil    = {}
  var marginSide = { "buy": -1, "sell": 1 }

  accUtil.computeAvailableMarginCoverageIfCrossShifted = function (orders, profitAndLoss, instruments, availableMargin) {
    return accUtil.computeAvailableMargin(orders, profitAndLoss, instruments, availableMargin, true)
  }

  accUtil.computeAvailableMarginCoverage = function (orders, profitAndLoss, instruments, availableMargin) {
    return accUtil.computeAvailableMargin(orders, profitAndLoss, instruments, availableMargin)
  }

  accUtil.computeAvailableMargin = function (orders, profitAndLoss, instruments, availableMargin, afterAdjustingCross) {
    affirm(orders, 'Orders not present')
    affirm(!profitAndLoss || (typeof profitAndLoss.pnl === 'number'), 'invalid Profit and loss ' + JSON.stringify(profitAndLoss))
    affirm(typeof availableMargin === 'number', 'Invalid margin balance ' + availableMargin)
    affirm(instruments, 'Instruments not specified for computing margin')

    var marginUsedByOrders = 0
    Object.keys(orders).forEach(function (symbol) {
      var instrument = instruments[symbol]
      Object.keys(orders[symbol]).forEach(function (uuid) {
        var order                    = orders[symbol][uuid]
        var marginPointsUsedByOrders = getMarginPointsUsedByOrder(order, instrument, afterAdjustingCross)
        marginUsedByOrders += Math.floor(mangler.fixed(marginPointsUsedByOrders * instrument.ticksperpoint * instrument.tickvalue))
      })
    })
    availableMargin -= marginUsedByOrders
    availableMargin += profitAndLoss && profitAndLoss.pnl || 0
    return availableMargin
  }

  function getMarginPointsUsedByOrder(order, instrument, afterAdjustingCross) {
    if (order.orderType === "TGT")  return 0

    var quantity = order.quantity - (order.filled || 0) - (order.cancelled || 0)
    var cushion  = order.cushion || instrument.stopcushion

    if (order.orderType === "STP" && order.crossMargin && afterAdjustingCross) {
      return mangler.fixed((instrument.crossMarginInitialStop + cushion) * quantity)
    }

    if (order.orderType === "STP") {
      var entryAmount = order.entryAmount || order.executionPrice * quantity
      // var executionPrice    = order.executionPrice
      var exitAmount  = order.price * quantity
      return mangler.fixed(marginSide[order.side] * (entryAmount - exitAmount) + cushion * quantity)
    }

    return mangler.fixed(quantity * (order.stopPrice + cushion ))
  }

  return accUtil
})()
