var expect         = require("expect.js")
var validator      = require("../src/validator")
var validateCreate = validator.validateCreateOrder
var validateUpdate = validator.validateUpdateOrder
var fixtures       = require("fixtures.js")(__filename)
var util           = require("../src/util")

describe("request validator", function () {
  it("should allow only positive quantity", function () {
    var order = util.clone(fixtures.LMT, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    delete order.quantity
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/quantity undefined expecting number, found undefined/)
    order.quantity = 0
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/should be greater than 0/)
    order.quantity = "i am not a number"
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/expecting number, found/)
    order.quantity = 1.5
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/is invalid. quantity should be multiple of 1/)

  })

  it("should allow only positive value of price except for MKT order", function () {
    var order = util.clone(fixtures.SLM, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    delete order.price
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/price undefined expecting number, found undefined/)
    order.price = 0
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/should be greater than 0/)
    order.price = "i am not a number"
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/expecting number, found/)
  })

  it("valid price for update orders", function () {
    var order = util.clone(fixtures.SLM, true)
    var orders = {}
    Object.keys(fixtures).forEach(function(type){
      orders[fixtures[type].instrument] = orders[fixtures[type].instrument] || {}
      orders[fixtures[type].instrument][fixtures[type].uuid] = util.clone(fixtures[type])
    })
    expect(validateUpdate).withArgs({"test":{ ticksperpoint: 10 }},[order], orders).to.not.throwException()
    delete order.price
    expect(validateUpdate).withArgs({"test":{ ticksperpoint: 10 }},[order], orders).to.throwException()
    order.price = 0
    expect(validateUpdate).withArgs({"test":{ ticksperpoint: 10 }},[order], orders).to.throwException(/should be greater than 0/)
    order.price = "i am not a number"
    expect(validateUpdate).withArgs({"test":{ ticksperpoint: 10 }},[order], orders).to.throwException(/expecting number, found/)
    order.price = 12.123
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order], orders).to.throwException(/is invalid. price should be multiple of/)
  })

  it("should not allow any price for MKT order", function () {
    var order = util.clone(fixtures.MKT, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.price = 19
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/MKT orders cannot specify price/)
  })
  it("should allow only buy or sell side", function () {
    var order = util.clone(fixtures.SLM, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
  })

  it("should allow price based on ticksize and ticksperpoint", function () {
    var order = util.clone(fixtures.LMT, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.price = 12.123
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/is invalid. price should be multiple of/)
  })

  it("should allow valid stop price", function () {
    var order = util.clone(fixtures.STM, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.stopPrice = 12.1
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.stopPrice = 0
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/should be greater than 0/)
    order.stopPrice = 12.13
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/is invalid. stopPrice should be multiple of/)
    order.stopPrice = "not a number"
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/stopPrice not a number expecting number, found string/)
  })

  it("should allow valid target price", function () {
    var order = util.clone(fixtures.SLM, true)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.targetPrice = 12.1
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.not.throwException()
    order.targetPrice = -0.1
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/should be atleast 0/)
    order.targetPrice = 12.123
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/is invalid. targetPrice should be multiple of/)
    order.targetPrice = "not a number"
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/targetPrice not a number expecting number, found string/)
  })

  it("should allow only MKT, LMT, SLM,STM to create", function () {
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.MKT]).to.not.throwException()
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.LMT]).to.not.throwException()
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.SLM]).to.not.throwException()
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.STP]).to.throwException()
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.STM]).to.not.throwException()
    var order = util.clone(fixtures.TGT, true)
    delete order.uuid
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[order]).to.throwException(/is not a valid order type. Valid orderTypes are {"MKT":"Market","LMT":"Limit","SLM":"Stop Limit","STM":"Stop Market"}/)
    expect(validateCreate).withArgs({"test":{ ticksperpoint: 10 }},[fixtures.TGT1]).to.throwException()
  })

})