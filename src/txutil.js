var bitcoin     = require('bitcoinjs-lib')
var assert      = require('affirm.js')
var feePerKB    = 50000
var bitcoinDust = 5430

module.exports = (function () {
  var txutil = {}

  txutil.createTx = function (txData) {
    var source      = txData.input
    var destination = txData.destination
    var amount      = txData.amount
    var txFee       = txData.txFee
    var unspents    = txData.unspents
    var isMultisig  = txData.isMultisig
    var network     = txData.network ? bitcoin.networks[txData.network] : bitcoin.networks.bitcoin
    var feeInclusive = txData.feeInclusive

    assert(typeof amount === 'number', "invalid amount " + amount)
    assert(unspents, 'No unspents available')
    unspents = txutil.filterUnspents(unspents)
    if (!txFee) {
      var inoutWithoutFee = txutil.getInOutFromUnspentsForAmount(unspents, amount, source, destination, 0)
      txFee               = txutil.getTransactionFee(inoutWithoutFee.inputs.length, inoutWithoutFee.outputs.length, isMultisig)
    }
    var transferAmount = feeInclusive ? amount - txFee : amount
    var inouts = txutil.getInOutFromUnspentsForAmount(unspents, transferAmount, source, destination, txFee)
    return txutil.createBitcoinTransaction(inouts.inputs, inouts.outputs, network)
  }

  txutil.getInOutFromUnspentsForAmount = function (unspents, transferAmount, source, destination, fee) {
    var totalUnspentsValue = 0, inputs = [], outputs = []
    for (var i = 0; i < unspents.length && totalUnspentsValue < (transferAmount + fee); i++) {
      var unspent = unspents[i];
      inputs.push({ txid: unspent.txid, vout: unspent.vout })
      totalUnspentsValue += unspent.amount
    }
    outputs.push({ address: destination, amount: transferAmount })
    var change = totalUnspentsValue - (transferAmount + fee)
    assert(change >= 0, 'Insufficient balance in UTXO for address ' + source)
    if (change > bitcoinDust) {
      outputs.push({ address: source, amount: change })
    }
    return { inputs: inputs, outputs: outputs }
  }

//****************************************************** transaction batch start

  txutil.getTransactionFee = function (inputsSize, outputsSize, isMultiSig) {
    var bytes = inputsSize * (isMultiSig ? 250 : 149) + outputsSize * 34 + 10
    return Math.round(feePerKB * bytes / 1000)
  }

  txutil.filterUnspents = function (unspents) {
    var filtered = []
    for (var i = 0; i < unspents.length; i++) {
      var unspent = unspents[i];
      if (unspent.confirmations < 1) continue;
      if (unspent.double_spend) continue
      if (unspent.spent) continue;
      filtered.push(unspent)
    }
    return filtered
  }

//****************************************************** transaction batch done

  txutil.createBitcoinTransaction = function (inputs, outputs, network) {
    var txb = new bitcoin.TransactionBuilder(network)
    inputs.forEach(function (input) {
      txb.addInput(input.txid, input.vout)
    })
    outputs.forEach(function (output) {
      txb.addOutput(output.address, output.amount)
    })
    return txb.buildIncomplete().toHex()
  }

  return txutil
})()
