"use strict";

const Web3 = require('web3');
const BigNumber = web3.BigNumber;
const Address = require('./address');
const assert = require('chai').assert
const truffleAssert = require('truffle-assertions');

var GoalState = Object.freeze({
  'WAITING':1,
  'PASS':2,
  'FAIL':3,
});

var CrucibleState = Object.freeze({
  'OPEN':1,
  'LOCKED':2,
  'JUDGEMENT':3,
  'FINISHED':4,
  'PAID':5,
  'BROKEN':6,
});

function CrucibleUtils(options) {
  if (false === (this instanceof CrucibleUtils)) {
   return new CrucibleUtils(options);
  }

  options = options || {};

  this.address = options.address || new Address();
  this.gasPrice = options.gasPrice || 100000000000;
  this.timeout = options.timeout || 691200;
  this.feeNumerator = options.feeNumerator || 100;

  this.zeroAmountEth = new BigNumber(0);
  this.zeroAmountWei = web3.toWei(this.zeroAmountEth, "ether");

  this.tooLowAmountEth = new BigNumber(0.01);
  this.tooLowAmountWei = web3.toWei(this.tooLowAmountEth, "ether");

  this.minAmountEth = new BigNumber(0.25);
  this.minAmountWei = web3.toWei(this.minAmountEth, "ether");

  this.riskAmountEth = new BigNumber(0.5);
  this.riskAmountWei = web3.toWei(this.riskAmountEth, "ether");
}

CrucibleUtils.prototype.sleep = require('util').promisify(setTimeout);

CrucibleUtils.prototype.addBySender = async function (crucible, sender, participant, _amount) {
  var amount = (_amount === undefined) ? this.riskAmountWei : _amount;
  return await web3.eth.getTransactionReceipt(
    await crucible.add.sendTransaction(
      this.address[participant],
      {
        'from': this.address[sender],
        'value': amount,
        'gasPrice': this.gasPrice,
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
};

CrucibleUtils.prototype.goalStateIsPass = function (state) {
  if (this.getGoalState(state) === GoalState.PASS) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.goalStateIsFail = function (state) {
  if (this.getGoalState(state) === GoalState.FAIL) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.getCrucibleState = function (_state) {
  var state;

  switch(_state.toNumber()) {
    case 1:
      state = CrucibleState.LOCKED;
      break;
    case 2:
      state = CrucibleState.JUDGEMENT;
      break;
    case 3:
      state = CrucibleState.FINISHED;
      break;
    case 4:
      state = CrucibleState.PAID;
      break;
    case 5:
      state = CrucibleState.BROKEN;
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
};

CrucibleUtils.prototype.crucibleStateIsLocked = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.LOCKED) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.crucibleStateIsJudgement = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.JUDGEMENT) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.crucibleStateIsFinished = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.FINISHED) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.crucibleStateIsPaid = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.PAID) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.crucibleStateIsBroken = function (state) {
  if (this.getCrucibleState(state) === CrucibleState.BROKEN) {
    return true;
  }

  return false;
};

CrucibleUtils.prototype.gasCost = async function (_tx) {
  var tx = _tx;

  if (tx.gasUsed === undefined) {
    tx = await web3.eth.getTransactionReceipt(_tx);
  }

  return (this.gasPrice * tx.gasUsed);
};

CrucibleUtils.prototype.assertStartBalances =
  async function (crucible, risk, startBalances, addTx) {

  var balance;
  var commitment;

  // make sure the contract balance increases by the risked amount
  balance = await web3.eth.getBalance(crucible.address);
  assert.equal(
    balance.toNumber(),
    risk.times(3),
    'crucible contract balance is correct'
  );

  for (var i = 1; i <= 3; i++) {
    // make sure the commitment has the correct balance
    commitment = await crucible.commitments.call(this.address['user' + i]);
    assert.equal(
      commitment[1].toNumber(),
      this.goalStateIsFail(commitment[2]) ? 0 : risk,
      'user' + i + ': risk correct'
    );

    // make sure the each participant's balance dropped by their risk + gas
    this.assertUserWalletBalance(
      'user' + i,
      startBalances['user' + i]
        .minus(await this.gasCost(addTx['user' + i]))
        .minus(risk)
        .toNumber(),
    );
  }
};

// this checks balances in the crucible
CrucibleUtils.prototype.assertUserBalances = async function (crucible, bal) {
  if (bal === undefined || bal === 0) {
    bal = new BigNumber(0);
  }

  for (var i = 1; i <= 3; i++) {
    var commitment = await crucible.commitments.call(this.address['user' + i]);
    assert.equal(
      commitment[1].toNumber(), bal.toNumber(), 'user' + i + ': correct balance'
    );
  }
};

CrucibleUtils.prototype.assertContractBalance = async function (crucible, bal) {
  if (bal === undefined || bal === 0) {
    bal = new BigNumber(0);
  }

  var balance = await web3.eth.getBalance(crucible.address);
  assert.equal(
    balance.toNumber(), bal.toNumber(), 'crucible balance is correct'
  );
};

CrucibleUtils.prototype.assertBalanceZero = async function (crucible) {
  await this.assertUserBalances(crucible, 0);
  await this.assertContractBalance(crucible, 0);
};

CrucibleUtils.prototype.assertCrucibleState =
  async function (crucible, evdata, eventName, fromTest, toTest) {

  var self = this;

  // test that we got the event
  truffleAssert.eventEmitted(evdata, eventName, (ev) => {
    return fromTest.call(self, ev.fromState) && toTest.call(self, ev.toState);
  }, 'got CrucibleStateChange: fromState and toState are correct');

  // test that the state is in toTest
  var state = await crucible.state.call();
  assert(toTest.call(self, state), 'crucible is in the correct state');
};

// this checks balances in the wallets
CrucibleUtils.prototype.assertUserWalletBalance =
  async function (user, expectedBalance) {

  var balance = await web3.eth.getBalance(this.address[user]);
  assert.equal(
    balance.toNumber(),
    expectedBalance,
    user + ': balance correct'
  );
};

CrucibleUtils.prototype.assertEventSent =
  async function (evdata, eventName, addr, amount) {

  truffleAssert.eventEmitted(evdata, eventName, (ev) => {
    return ev.recipient === addr && ev.amount.eq(amount);
  }, 'got ' + eventName + ' event with correct recipient and amount');
};

module.exports = CrucibleUtils;
