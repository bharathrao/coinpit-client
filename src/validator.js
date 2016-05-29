var assert = require('affirm.js')

module.exports = function (instrument) {
  var validator         = {}
  var validOrdersTypes  = { MKT: "Market", LMT: "Limit", SLM: "Stop Limit", STM: "Stop Market" }
  var validOrdersString = JSON.stringify(validOrdersTypes)
  var validOrderSide    = { buy: true, sell: true }

  validator.validateCreateOrder = function (order) {
    assertUserId(order)
    assertOrderSide(order)
    assertQuantity(order)
    assertPrice(order)
    assertOrderType(order)
    assertClientId(order)
    assertStopPrice(order)
    assertTargetPrice(order)
  }

  validator.validateUpdateOrder = function (order, originalOrders) {
    assert(originalOrders[order.uuid], 'No order found with uuid: ' + order.uuid, 422)
    assert(originalOrders[order.uuid].price, 'Orders created with no price can not be modified. uuid: ' + order.uuid, 422)
    validateNumber("price", order.price, instrument.ticksperpoint)
  }

  function assertClientId(order) {
    assert(order.clientid, 'clientid is missing')
  }

  function assertOrderSide(order) {
    assert(validOrderSide[order.side], ': side ' + order.side + ' should be "buy" or "sell"', 422)
  }

  function assertQuantity(order) {
    validateNumber("quantity", order.quantity, 1)
  }

  function assertPrice(order) {
    if (order.orderType === 'MKT') {
      assert(order.price === undefined, ': MKT orders cannot specify price ' + order.price, 422)
    } else {
      validateNumber("price", order.price, instrument.ticksperpoint)
    }
  }

  function assertOrderType(order) {
    assert(validOrdersTypes[order.orderType], order.orderType + " is not a valid order type. Valid orderTypes are " +validOrdersString)
  }

  function assertStopPrice(order) {
    if (order.stopPrice !== undefined) validateNumber("stopPrice", order.stopPrice, instrument.ticksperpoint)
  }

  function assertTargetPrice(order) {
    if (order.targetPrice !== undefined) validateNumber("targetPrice", order.targetPrice, instrument.ticksperpoint)
  }

  function assertUserId(order) {
    assert(order.userid, 'userid is missing')
  }

  function validateNumber(name, value, multiplier) {
    var type = typeof value
    assert(type === 'number', name + " " + value + " expecting number, found " + type, 422)
    assert(value > 0, name + " " + value + " should be greater than 0", 422)
    var quantity = value * multiplier
    var multiple = 1 / multiplier
    assert(quantity % 1 === 0, name + " " + value + " is invalid. " + name + " should be multiple of " + multiple, 422)
  }

  return validator

}