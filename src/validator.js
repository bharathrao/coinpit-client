var assert = require('affirm.js')

module.exports = (function () {
  var validator         = {}
  var validOrdersTypes  = { MKT: "Market", LMT: "Limit", SLM: "Stop Limit", STM: "Stop Market" }
  var validOrdersString = JSON.stringify(validOrdersTypes)
  var validOrderSide    = { buy: true, sell: true }

  validator.validateCreateOrder = function (instrument, orders) {
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      assertUserId(order)
      assertOrderSide(order)
      assertQuantity(order)
      assertPrice(order, instrument)
      assertOrderType(order)
      assertClientId(order)
      assertStopPrice(order, instrument)
      assertTargetPrice(order, instrument)
    }
  }

  validator.validateUpdateOrder = function (instrument, orders, originalOrders) {
    for (var i = 0; i < orders.length; i++) {
      var order         = orders[i];
      var originalOrder = originalOrders[order.uuid]
      assert(originalOrder, 'No order found with uuid: ' + order.uuid, 422)
      assert(originalOrder.price, 'Orders created with no price can not be modified. uuid: ' + order.uuid, 422)
      if (originalOrder.orderType === 'TGT' && order.price === 'NONE') return
      validateIfNumberGreaterThanZero("price", order.price, instrument.ticksperpoint)
    }
  }

  function assertClientId(order) {
    assert(order.clientid, 'clientid is missing')
  }

  function assertOrderSide(order) {
    assert(validOrderSide[order.side], ': side ' + order.side + ' should be "buy" or "sell"', 422)
  }

  function assertQuantity(order) {
    validateIfNumberGreaterThanZero("quantity", order.quantity, 1)
  }

  function assertPrice(order, instrument) {
    if (order.orderType === 'MKT') {
      assert(order.price === undefined, ': MKT orders cannot specify price ' + order.price, 422)
    } else {
      validateIfNumberGreaterThanZero("price", order.price, instrument.ticksperpoint)
    }
  }

  function assertOrderType(order) {
    assert(validOrdersTypes[order.orderType], order.orderType + " is not a valid order type. Valid orderTypes are " + validOrdersString)
  }

  function assertStopPrice(order, instrument) {
    if (order.stopPrice !== undefined)
      validateIfNumberGreaterThanZero("stopPrice", order.stopPrice, instrument.ticksperpoint)
  }

  function assertTargetPrice(order, instrument) {
    if (order.targetPrice !== undefined && order.targetPrice !== 'NONE')
      validateIfNumberGreaterThanOrEqualToZero("targetPrice", order.targetPrice, instrument.ticksperpoint)
  }

  function assertUserId(order) {
    assert(order.userid, 'userid is missing')
  }

  function validateIfNumberGreaterThanZero(name, value, multiplier) {
    validateIfNumber(name, value, multiplier)
    assert(value > 0, name + " " + value + " should be greater than 0", 422)
  }

  function validateIfNumberGreaterThanOrEqualToZero(name, value, multiplier) {
    validateIfNumber(name, value, multiplier)
    assert(value >= 0, name + " " + value + " should be atleast 0", 422)
  }

  function validateIfNumber(name, value, multiplier) {
    var type = typeof value
    assert(type === 'number', name + " " + value + " expecting number, found " + type, 422)
    var quantity = value * multiplier
    var multiple = 1 / multiplier
    assert(quantity % 1 === 0, name + " " + value + " is invalid. " + name + " should be multiple of " + multiple, 422)
  }

  return validator

})()