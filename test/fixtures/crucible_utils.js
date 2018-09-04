"use strict";

const Web3 = require('web3');
const BigNumber = web3.BigNumber;
const Address = require('./address');

var GoalState = Object.freeze({ 'WAITING':1, 'PASS':2, 'FAIL':3 })
var CrucibleState = Object.freeze({ 'OPEN':1, 'LOCKED':2, 'FINISHED':3 })

function CrucibleUtils(options) {
  if (false === (this instanceof CrucibleUtils)) {
   return new CrucibleUtils(options);
  }

  options = options || {};

  this.address = options.address || new Address();

  this.zeroAmountEth = new BigNumber(0);
  this.zeroAmountWei = web3.toWei(this.zeroAmountEth, "ether");

  this.tooLowAmountEth = new BigNumber(0.01);
  this.tooLowAmountWei = web3.toWei(this.tooLowAmountEth, "ether");

  this.minAmountEth = new BigNumber(0.25);
  this.minAmountWei = web3.toWei(this.minAmountEth, "ether");

  this.riskAmountEth = new BigNumber(0.5);
  this.riskAmounttWei = web3.toWei(this.riskAmountEth, "ether");
}

CrucibleUtils.prototype.sleep = require('util').promisify(setTimeout);

CrucibleUtils.prototype.addBySender = async function (crucible, sender, participant, _amount) {
  var amount = (_amount === undefined) ? this.riskAmounttWei : _amount;
  return await web3.eth.getTransactionReceipt(
    await crucible.add.sendTransaction(
      this.address[participant],
      {
        'from': this.address[sender],
        'value': amount
      }
    )
  );
};

CrucibleUtils.prototype.add = async function (crucible, participant, amount) {
  return await this.addBySender(crucible, participant, participant, amount);
};

CrucibleUtils.prototype.addDays = function (date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

CrucibleUtils.prototype.addSeconds = function (date, seconds) {
  var result = new Date(date);
  result.setTime(result.getTime() + (seconds * 1000));
  return result;
};

// default: now
CrucibleUtils.prototype.startDate = function (secondsFromNow) {
  if (secondsFromNow === undefined) { secondsFromNow = (86400 * 0) }
  return Math.floor(this.addSeconds(Date.now(), secondsFromNow) / 1000);
};

// default: 1 day from now
CrucibleUtils.prototype.lockDate = function (secondsFromNow) {
  if (secondsFromNow === undefined) { secondsFromNow = (86400 * 1) }
  return Math.floor(this.addSeconds(Date.now(), secondsFromNow) / 1000);
};

// default: 8 days from now
CrucibleUtils.prototype.endDate = function (secondsFromNow) {
  if (secondsFromNow === undefined) { secondsFromNow = (86400 * 8) }
  return Math.floor(this.addSeconds(Date.now(), secondsFromNow) / 1000);
};

CrucibleUtils.prototype.getGoalState = function (_state) {
  var state;

  switch(_state.toNumber()) {
    case 1:
      state = GoalState.PASS;
      break;
    case 2:
      state = GoalState.FAIL;
      break;
    default:
      state = GoalState.WAITING;
  }

  return state;
};

CrucibleUtils.prototype.goalStateIsWaiting = function (state) {
  if (this.getGoalState(state) === GoalState.WAITING) {
    return true;
  }

  return false;
}

CrucibleUtils.prototype.goalStateIsPass = function (state) {
  if (this.getGoalState(state) === GoalState.PASS) {
    return true;
  }

  return false;
}

CrucibleUtils.prototype.goalStateIsFail = function (state) {
  if (this.getGoalState(state) === GoalState.FAIL) {
    return true;
  }

  return false;
}

CrucibleUtils.prototype.getCrucibleState = function (_state) {
  var state;

  switch(_state.toNumber()) {
    case 1:
      state = CrucibleState.LOCKED;
      break;
    case 2:
      state = CrucibleState.FINISHED;
      break;
    default:
      state = CrucibleState.OPEN;
  }

  return state;
};

CrucibleUtils.prototype.crucibleStateIsOpen = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.OPEN) {
    return true;
  }

  return false;
}

CrucibleUtils.prototype.crucibleStateIsLocked = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.LOCKED) {
    return true;
  }

  return false;
}

CrucibleUtils.prototype.crucibleStateIsFinished = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.FINISHED) {
    return true;
  }

  return false;
}

module.exports = CrucibleUtils;
