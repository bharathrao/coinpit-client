module.exports = (function () {
  var instruments = {};
  instruments.init         = function (configs) {
    var symbols = Object.keys(configs)
    var type    = {
      inverse: require("./instruments/inverse"),
      quanto : require("./instruments/quanto")
    }

    for (var i = 0; i < symbols.length; i++) {
      var symbol          = symbols[i];
      var inst            = configs[symbol]
      instruments[symbol] = type[inst.type](inst)
    }
  }
  return instruments
})()
