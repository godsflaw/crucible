"use strict";

const Web3 = require('web3');
const BigNumber = web3.BigNumber;
const Address = require('./address');

function CrucibleUtils(options) {
  if (false === (this instanceof CrucibleUtils)) {
   return new CrucibleUtils(options);
  }

  options = options || {};

  this.address = options.address || new Address();

  this.tooLowAmountEth = new BigNumber(0.01);
  this.tooLowAmountWei = web3.toWei(this.minAmountEth, "ether");

  this.minAmountEth = new BigNumber(0.25);
  this.minAmountWei = web3.toWei(this.minAmountEth, "ether");

  this.riskAmountEth = new BigNumber(0.5);
  this.riskAmounttWei = web3.toWei(this.riskAmountEth, "ether");
}

CrucibleUtils.prototype.addDays = function (date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

CrucibleUtils.prototype.startDate = function (daysFromNow) {
  if (daysFromNow === undefined) { daysFromNow = 0 }
  return Math.floor(this.addDays(Date.now(), daysFromNow) / 1000);
};

CrucibleUtils.prototype.closeDate = function (daysFromNow) {
  if (daysFromNow === undefined) { daysFromNow = 1 }
  return Math.floor(this.addDays(Date.now(), daysFromNow) / 1000);
};

CrucibleUtils.prototype.endDate = function (daysFromNow) {
  if (daysFromNow === undefined) { daysFromNow = 8 }
  return Math.floor(this.addDays(Date.now(), daysFromNow) / 1000);
};

CrucibleUtils.prototype.add = async function (crucible, account, amount) {
  amount = (amount === undefined) ? this.riskAmounttWei : amount;

  return await web3.eth.getTransactionReceipt(
    await crucible.add.sendTransaction(
      this.address[account], amount, { from: this.address.oracle }
    )
  );
};

module.exports = CrucibleUtils;
