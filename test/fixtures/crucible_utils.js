"use strict";

function CrucibleUtils(options) {
  if (false === (this instanceof CrucibleUtils)) {
   return new CrucibleUtils(options);
  }

  options = options || {};
}

CrucibleUtils.prototype.addDays = function (date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

module.exports = CrucibleUtils;
