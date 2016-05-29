module.exports = (function () {
  var util = {}

  util.clone = function clone(obj) {
    return JSON.parse(JSON.stringify(obj))
  }
  return util
})()