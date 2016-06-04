var txutil      = require('../src/txutil')
var expect      = require('expect.js')
var fixtures    = require('fixtures.js')(__filename)

require('mocha-generators').install()

describe('txutil', function () {
  it('createTx', function() {
    var f  = fixtures.createtx
    var result = txutil.createTx({ input: f.input, destination: f.destination, amount: f.amount, unspents: f.unspents, margin: f.margin, network:f.network })
    expect(result).to.eql(f.expected)
  })

  describe("filterUnspents", function () {
    fixtures.filterUnspents.forEach(function (test, index) {
      it(`${index}: filterUnspents`, function () {
        var result = txutil.filterUnspents(test.input)
        expect(result).to.be.eql(test.output)
      })
    })
  })

})


