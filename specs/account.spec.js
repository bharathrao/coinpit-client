var expect      = require('expect.js')
var fixtures    = require('./fixtures/account.spec.json')
var Account     = require("../src/account")
var Loginless   = require("./loginless.mock")
var util        = require('../src/util')
var assert      = require("affirm.js")
var _           = require('lodash')
var mock        = require('mock-require')

require('mocha-generators').install()

describe.skip('account test', function () {
  before(function () {
    mock('insight-util', function () {
      return { subscribe: nop, unsubscribe: nop }
    })
  })
  after(mock.stopAll)

  it('should be able to create orders', function*() {
    var test      = fixtures.createOrders
    var loginless = Loginless(test.loginlessEvent, [test.result])

    var account = Account(loginless, fixtures.configs)
    // account.insightUtil = insighteUtil

    account.assertAvailableMargin                  = nop
    account.calculateAvailableMarginIfCrossShifted = nop

    var symbol  = fixtures.configs.config.default.instrument
    var created = yield account.createOrders(symbol, [test.order])
    expect(created).to.eql([test.result])
    expect(Object.keys(account.openOrders[symbol])).to.eql([test.result.uuid])
  })

  it('fail createOrders', function*() {
    var test                                       = fixtures.createOrdersFail
    var loginless                                  = Loginless(test.loginlessEvent, test.result)
    var account                                    = Account(loginless, fixtures.configs)
    // account.insightUtil                            = insighteUtil
    account.assertAvailableMargin                  = nop
    account.calculateAvailableMarginIfCrossShifted = nop
    try {
      var symbol = fixtures.configs.config.default.instrument
      yield account.createOrders(symbol, [test.order])
      expect().fail("Exception was expected, but was successful")
    } catch (e) {
      expect(e).to.be.eql(test.result.message)
      expect(account.getOpenOrders()).to.be.empty()
    }
  })

  it('updateOrders', function*() {
    var test                                       = fixtures.updateOrders
    var loginless                                  = Loginless(test.loginlessEvent, [test.result])
    var account                                    = Account(loginless, fixtures.configs)
    // account.insightUtil                            = insighteUtil
    account.assertAvailableMargin                  = nop
    account.calculateAvailableMarginIfCrossShifted = nop
    var symbol                                     = fixtures.configs.config.default.instrument
    account.openOrders[symbol]                     = account.openOrders[symbol] || {}
    account.openOrders[symbol][test.order.uuid]    = test.order

    var updated              = util.clone(test.order)
    updated[test.change.key] = test.change.value

    var created = yield account.updateOrders(symbol, [updated])
    expect(created).to.eql([test.result])
    expect(account.openOrders[symbol][test.result.uuid].price).to.eql(test.result.price)
  })

  it.skip('closedOrders', function*() {
    var test                                       = fixtures.closedOrders
    var loginless                                  = Loginless()
    var account                                    = Account(loginless, fixtures.configs)
    // account.insightUtil                            = insighteUtil
    account.assertAvailableMargin                  = nop
    account.calculateAvailableMarginIfCrossShifted = nop
    var closedOrders1                              = yield account.closedOrders(undefined, 1)
    expect(closedOrders1).to.eql(test.result1)
    var closedOrders2 = yield account.closedOrders(closedOrders1[0], 1)
    expect(closedOrders2).to.eql(test.result2)
  })

  it('assertAvailableMargin', function*() {
    var test                                       = fixtures.assertAvailableMargin
    var loginless                                  = Loginless()
    var account                                    = Account(loginless, fixtures.configs)
    // account.insightUtil                            = insighteUtil
    account.calculateAvailableMarginIfCrossShifted = function (orders) {
      expect(_.toArray(orders[fixtures.configs.config.default.instrument])).to.eql(test.result.orders)
    }
    account.openOrders                             = test.openOrders
    account.getPostAvailableMargin(test.orders)
  })

  it('create Orders with insufficient margin', function*() {
    var test                         = fixtures.createOrdersWithInsufficientMargin
    var loginless                    = Loginless()
    var account                      = Account(loginless, fixtures.configs)
    // account.insightUtil              = insighteUtil
    var symbol                       = fixtures.configs.config.default.instrument
    account.assertAvailableMargin    = function () {
      assert(false, test.result.message)
    }
    account.calculateAvailableMargin = nop
    try {
      yield account.createOrders(symbol, [test.order])
      expect().fail("Exception was expected, but was successful")
    } catch (e) {
      expect(e.message).to.be.eql(test.result.message)
    }

  })

})

function nop() {
  return 1
}
