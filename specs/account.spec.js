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
    var created   = yield account.createOrders(test.order)
    expect(created).to.eql([test.result])
    expect(Object.keys(account.getOpenOrders())).to.eql([test.result.uuid])
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
    expect(account.getOpenOrders()[test.result.uuid].price).to.eql(test.result.price)
  })

})