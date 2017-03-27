var mangler = require("mangler")
var assert  = require("affirm.js")

module.exports = function (config) {
  var instrument          = {}
  instrument.config       = config
  instrument.amountSign   = { buy: -1, sell: 1 }
  instrument.symbol       = config.symbol

  instrument.getNormalizedPrice = function (price) {
    return price
  }

  instrument.calculateMarginRequiredByOrder = function (order, bands, excludeExtraForCross) {
    var points = getMarginPointsUsedByOrder(order, excludeExtraForCross)
    return Math.ceil(mangler.fixed(points * config.ticksperpoint * config.tickvalue))
  }

  function getMarginPointsUsedByOrder(order, excludeExtraForCross) {
    if (order.orderType === "TGT")  return 0
    var quantity = toBeFilled(order)
    var cushion  = getCushion(order)
    if (order.orderType === "STP" && order.crossMargin && excludeExtraForCross) {
      return mangler.fixed((config.crossMarginInitialStop + cushion) * quantity)
    }
    if (order.orderType === "STP") {
      var entryAmount = order.entryAmount || order.executionPrice * quantity
      var exitAmount  = order.price * quantity
      return mangler.fixed(instrument.amountSign[order.side] * (entryAmount - exitAmount) + cushion * quantity)
    }
    return mangler.fixed(quantity * (order.stopPrice + cushion ))
  }

  function getCushion(order) {
    return order.cushion || config.stopcushion
  }

  function toBeFilled(order) {
    return order.quantity - (order.filled || 0) - (order.cancelled || 0)
  }

  return instrument
}
