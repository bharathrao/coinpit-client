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
      })
    })
    availableMargin -= marginUsedByOrders
    availableMargin += profitAndLoss && profitAndLoss.pnl || 0
    return availableMargin
  }

  return accUtil
})()
