var affirm      = require('affirm.js')
var mangler     = require('mangler')
var instruments = require('./instruments')

module.exports = (function () {
  var accUtil    = {}
  var marginSide = { "buy": -1, "sell": 1 }

  accUtil.computeAvailableMarginCoverageIfCrossShifted = function (orders, profitAndLoss, availableMargin, bands) {
    return accUtil.computeAvailableMargin(orders, profitAndLoss, availableMargin, bands, true)
  }

  accUtil.computeAvailableMarginCoverage = function (orders, profitAndLoss, availableMargin, bands) {
    return accUtil.computeAvailableMargin(orders, profitAndLoss, availableMargin, bands)
  }

  accUtil.computeAvailableMargin = function (orders, profitAndLoss, availableMargin, bands, afterAdjustingCross) {
    affirm(orders, 'Orders not present')
    affirm(!profitAndLoss || (typeof profitAndLoss.pnl === 'number'), 'invalid Profit and loss ' + JSON.stringify(profitAndLoss))
    affirm(typeof availableMargin === 'number', 'Invalid margin balance ' + availableMargin)
    affirm(Object.keys(bands), 'Invalid marketBuys')

    var marginUsedByOrders = 0
    Object.keys(orders).forEach(function (symbol) {
      var instrument = instruments[symbol]
      Object.keys(orders[symbol]).forEach(function (uuid) {
        var order = orders[symbol][uuid]
        marginUsedByOrders += instrument.calculateMarginRequiredByOrder(order, bands, afterAdjustingCross)
        marginUsedByOrders += accUtil.getCommission(order, instrument)
      })
    })
    availableMargin -= marginUsedByOrders
    availableMargin += profitAndLoss && profitAndLoss.pnl || 0
    // availableMargin -= accUtil.getCommissionForOpenPositions(positions)
    return availableMargin
  }

  accUtil.getCommission = function (order, instrument) {
    affirm(order, 'Order undefined')
    affirm(instrument, 'Instrument undefined')
    if (order.orderType !== 'STP') return 0
    affirm(order.entryAmount, 'Entry Amount is not set')
    var quantity       = order.quantity - (order.filled || 0) - (order.cancelled || 0)
    var commissionRate = instrument.config.commission
    affirm(!isNaN(commissionRate), 'invalid commission rate ' + JSON.stringify(instrument))
    var commission     = commissionRate > -1 && commissionRate <= 1 ?
                         Math.round(order.entryAmount * commissionRate) :
                         quantity * commissionRate;
    return Math.round(commission * 1.5)
  }

  return accUtil
})()
