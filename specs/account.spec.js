var expect      = require('expect.js')
var fixtures    = require('fixtures.js')(__filename)
var Account     = require("../src/account")
var Loginless   = require("./loginless.mock")
var socket      = require("./socket.mock")
var util        = require('../src/util')
var accountUtil = require('../src/accountUtil')
var assert      = require("affirm.js")
var insighteUtil = {subscribe: nop, unsubscribe: nop}
var _ = require('lodash')
require('mocha-generators').install()

describe('account test', function () {

  it('createOrders', function*() {
    var test      = fixtures.createOrders
    var loginless = Loginless(test.loginlessEvent, [test.result])
    var account   = Account(test.serverResponse, loginless, socket, insighteUtil)

    account.assertAvailableMargin    = nop
    account.calculateAvailableMarginIfCrossShifted = nop

    var symbol = test.serverResponse.config.default.instrument
    var created = yield account.createOrders(symbol, [test.order])
    expect(created).to.eql([test.result])
    expect(Object.keys(account.openOrders[symbol])).to.eql([test.result.uuid])
  })

  it('fail createOrders', function*() {
    var test      = fixtures.createOrdersFail
    var loginless = Loginless(test.loginlessEvent, test.result)
    var account   = Account(test.serverResponse, loginless, socket, insighteUtil)

    account.assertAvailableMargin    = nop
    account.calculateAvailableMarginIfCrossShifted = nop
    try {
      var symbol = test.serverResponse.config.default.instrument
      yield account.createOrders(symbol,[test.order])
      expect().fail("Exception was expected, but was successful")
    } catch (e) {
      expect(e).to.be.eql(test.result.message)
      expect(account.getOpenOrders()).to.be.empty()
    }
  })

  it('updateOrders', function*() {
    var test      = fixtures.updateOrders
    var loginless = Loginless(test.loginlessEvent, [test.result])
    var account   = Account(test.serverResponse, loginless, socket, insighteUtil)

    account.assertAvailableMargin       = nop
    account.calculateAvailableMarginIfCrossShifted    = nop
    var symbol = test.serverResponse.config.default.instrument
    account.openOrders[symbol] = account.openOrders[symbol] || {}
    account.openOrders[symbol][test.order.uuid] = test.order

    var updated              = util.clone(test.order)
    updated[test.change.key] = test.change.value

    var created              = yield account.updateOrders(symbol,[updated])
    expect(created).to.eql([test.result])
    expect(account.openOrders[symbol][test.result.uuid].price).to.eql(test.result.price)
  })

  it.skip('closedOrders', function*() {
    var test      = fixtures.closedOrders
    var loginless = Loginless()
    var account   = Account(test.serverResponse, loginless, socket, insighteUtil)

    account.assertAvailableMargin    = nop
    account.calculateAvailableMarginIfCrossShifted = nop
    var closedOrders1 = yield account.closedOrders(undefined, 1)
    expect(closedOrders1).to.eql(test.result1)
    var closedOrders2 = yield account.closedOrders(closedOrders1[0], 1)
    expect(closedOrders2).to.eql(test.result2)
  })

  it('assertAvailableMargin', function*() {
    var test                         = fixtures.assertAvailableMargin
    var loginless                    = Loginless()
    var account                      = Account(test.serverResponse, loginless, socket, insighteUtil)
    account.calculateAvailableMarginIfCrossShifted = function (orders) {
      expect(_.toArray(orders[test.serverResponse.config.default.instrument])).to.eql(test.result.orders)
    }
    account.openOrders               = test.openOrders
    account.getPostAvailableMargin(test.orders)
  })

  it('create Orders with insufficient margin', function*() {
    var test                         = fixtures.createOrdersWithInsufficientMargin
    var loginless                    = Loginless()
    var account                      = Account(test.serverResponse, loginless, socket, insighteUtil)
    var symbol = test.serverResponse.config.default.instrument
    account.assertAvailableMargin    = function () {
      assert(false, test.result.message)
    }
    account.calculateAvailableMargin = nop
    try {
      yield account.createOrders(symbol,[test.order])
      expect().fail("Exception was expected, but was successful")
    } catch (e) {
      expect(e.message).to.be.eql(test.result.message)
    }

  })

})

function nop() {
  return 1
}
