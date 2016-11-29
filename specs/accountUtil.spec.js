var expect      = require('expect.js')
var fixtures    = require('fixtures.js')(__filename)
var accountUtil = require("../src/accountUtil")

var instrument = {
  "test": {
    "symbol"       : "test",
    "commission"   : 50000,
    "reward"       : -25000,
    "margin"       : 2100000,
    "stopcushion"  : 1.0,
    "stopprice"    : 1.0,
    "targetprice"  : 2.0,
    "ticksize"     : 1,
    "ticksperpoint": 10,
    "tickvalue"    : 100000
  }
}
describe("accountutil", function () {
  fixtures.forEach(function (test, index) {
    // if (index !== 1) return
    it(`${index}: ${test.description} `, function () {
      var availableMargin = accountUtil.computeAvailableMarginCoverage(test.input.orders, test.input.profitAndLoss, instrument, test.input.availableMargin)
      expect(availableMargin).to.be.eql(test.result)
    })
  })
})
