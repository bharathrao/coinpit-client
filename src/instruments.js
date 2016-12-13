module.exports = (function () {
  var instruments = {};
  instruments.init         = function (config) {
    var symbols = config.instruments;
    var type    = {
      inverse: require("./instruments/inverse"),
      quanto : require("./instruments/quanto")
    }

    for (var i = 0; i < symbols.length; i++) {
      var symbol          = symbols[i];
      var inst            = config.instrument[symbol]
      instruments[symbol] = type[inst.type](inst)
    }
  }
  return instruments
})()
