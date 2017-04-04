var assert = require('affirm.js')

module.exports = function (config) {
  var instrument    = {}
  instrument.config = config

  instrument.amountSign = { buy: -1, sell: 1 }
  instrument.positionSide = { buy: 1, sell: -1 }

  instrument.symbol    = config.symbol
  var contractusdvalue = config.contractusdvalue * 1e8

  instrument.getNormalizedPrice = function (price) {
    if (typeof price !== 'number') return price
    return Math.round(contractusdvalue / price)
  }

  instrument.calculateMarginRequiredByOrder = function (order, bands, excludeExtraForCross) {
    if (order.orderType === "TGT")  return 0
    if (order.orderType === 'STP' && order.crossMargin && excludeExtraForCross) {
      return getMarginRequiredForInverseCross(order)
    }
    var quantity = toBeFilled(order)
    if (order.orderType === 'STP') {
      return Math.abs(order.entryAmount - quantity * order.normalizedMaxStop)
    }
    var price = order.price || bands[config.symbol].min
    if (order.side === 'buy') price = Math.min(price, bands[config.symbol].min)
    var cushion      = getCushion(order)
    var stopPoints   = order.crossMargin ? config.crossMarginInitialStop : order.stopPrice
    var maxStopPrice = price - instrument.positionSide[order.side] * ( stopPoints + cushion)
    return quantity * Math.abs(instrument.getNormalizedPrice(price) - instrument.getNormalizedPrice(maxStopPrice))
  }

  function getMarginRequiredForInverseCross(order) {
    var quantity     = toBeFilled(order)
    var stopSign     = order.side === 'sell' ? -1 : 1
    var cushion      = getCushion(order)
    var stopPrice    = order.normalizedEntryPrice + stopSign * (config.crossMarginInitialStop + cushion)
    var btcStopPrice = instrument.getNormalizedPrice(stopPrice)
    return Math.abs(order.entryAmount - btcStopPrice * quantity)
  }

  function getCushion(order) {
    return order.cushion || config.stopcushion
  }

  function toBeFilled(order) {
    return order.quantity - (order.filled || 0) - (order.cancelled || 0)
  }

  return instrument
}