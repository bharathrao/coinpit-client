var expect    = require('expect.js')
var fixtures  = require('fixtures.js')(__filename)
var Account   = require("../src/account")
var Loginless = require("./loginless.mock")
var socket    = require("./socket.mock")
var util      = require('../src/util')

require('mocha-generators').install()

describe('account test', function () {

  it('createOrders', function*() {
    var test      = fixtures.createOrders
    var loginless = Loginless(test.loginlessEvent, [test.result])
    var account   = Account(test.serverResponse, loginless, socket)
    var created   = yield account.createOrders([test.order])
    expect(created).to.eql([test.result])
    expect(Object.keys(account.openOrders)).to.eql([test.result.uuid])
  })

  it('fail createOrders', function*() {
    var test      = fixtures.createOrdersFail
    var loginless = Loginless(test.loginlessEvent, test.result)
    var account   = Account(test.serverResponse, loginless, socket)
    try {
      yield account.createOrders([test.order])
      expect().fail("Exception was expected, but was successful")
    } catch (e) {
      expect(e).to.be.eql(test.result.message)
      expect(account.getOpenOrders()).to.be.empty()
    }
  })

  it('updateOrders', function*() {
    var test                            = fixtures.updateOrders
    var loginless                       = Loginless(test.loginlessEvent, [test.result])
    var account                         = Account(test.serverResponse, loginless, socket)
    account.openOrders[test.order.uuid] = test.order
    var updated                         = util.clone(test.order)
    updated[test.change.key]            = test.change.value
    var created                         = yield account.updateOrders([updated])
    expect(created).to.eql([test.result])
    expect(account.openOrders[test.result.uuid].price).to.eql(test.result.price)
  })

})