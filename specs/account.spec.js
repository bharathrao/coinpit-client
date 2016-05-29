var expect    = require('expect.js')
var fixtures  = require('fixtures.js')(__filename)
var Account   = require("../src/account")
var Loginless = require("./loginless.mock")
var socket    = require("./socket.mock")

require('mocha-generators').install()

describe('account test', function () {

  it('createOrders', function*() {
    var test      = fixtures.createOrder
    var loginless = Loginless(test.loginlessEvent, [test.result])
    var account   = Account(test.serverResponse, loginless, socket)
    var created   = yield account.createOrder(test.order)
    expect(created).to.eql(test.result)
  })

})