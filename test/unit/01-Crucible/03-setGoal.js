const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - setGoal', async (accounts) => {
  let cu;
  let address;
  let crucible;

  beforeEach(async () => {
    address = new Address();
    cu = new CrucibleUtils(address);

    crucible = await Crucible.new(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(1),
      cu.endDate(3),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
    var tx3 = await cu.add(crucible, 'user3');
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('setGoal works for PASS and FAIL in LOCKED and JUDGEMENT', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    var commitment = await crucible.commitments.call(address.user1);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmountWei, 'risk correct');
    assert.equal(
      cu.goalStateIsPass(commitment[2]), true, 'goal in pass state'
    );

    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    commitment = await crucible.commitments.call(address.user2);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), 0, 'risk zeroed out');
    assert.equal(
      cu.goalStateIsFail(commitment[2]), true, 'goal in fail state'
    );

    await cu.sleep(2000);
    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user3, true, { 'from': address.oracle }
    );

    var commitment = await crucible.commitments.call(address.user3);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmountWei, 'risk correct');
    assert.equal(
      cu.goalStateIsPass(commitment[2]), true, 'goal in pass state'
    );
  });

  it('setGoal emits CommitmentStateChange', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    tx = await crucible.setGoal(
      address.user1, true, { 'from': address.oracle }
    );

    truffleAssert.eventEmitted(tx, 'CommitmentStateChange', (ev) => {
      return ev.participant === address.user1 &&
        cu.goalStateIsWaiting(ev.fromState) &&
        cu.goalStateIsPass(ev.toState);
    }, 'fromState and toState are correct');

    tx = await crucible.setGoal(
      address.user2, false, { 'from': address.oracle }
    );

    truffleAssert.eventEmitted(tx, 'CommitmentStateChange', (ev) => {
      return ev.participant === address.user2 &&
        cu.goalStateIsWaiting(ev.fromState) &&
        cu.goalStateIsFail(ev.toState);
    }, 'participant, fromState, and toState are correct');
  });

  it('setGoal PASS increases the passCount', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var passCount = await crucible.passCount();
    assert.equal(passCount.toNumber(), 0, 'passCount is 0');

    tx = await crucible.setGoal(
      address.user1, true, { 'from': address.oracle }
    );

    passCount = await crucible.passCount();
    assert.equal(passCount.toNumber(), 1, 'passCount increased');

    tx = await crucible.setGoal(
      address.user2, true, { 'from': address.oracle }
    );

    passCount = await crucible.passCount();
    assert.equal(passCount.toNumber(), 2, 'passCount increased');
  });

  it('setGoal FAIL increases the penalty', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var penalty = await crucible.penalty();
    assert.equal(penalty.toNumber(), 0, 'penalty is 0');

    tx = await crucible.setGoal(
      address.user1, false, { 'from': address.oracle }
    );

    penalty = await crucible.penalty();
    assert.equal(
      penalty.toNumber(),
      cu.riskAmountWei.toNumber(),
      'penalty increased'
    );

    tx = await crucible.setGoal(
      address.user2, false, { 'from': address.oracle }
    );

    penalty = await crucible.penalty();
    assert.equal(
      penalty.toNumber(),
      cu.riskAmountWei.times(2).toNumber(),
      'penalty increased'
    );
  });

  it('setGoal PASS/FAIL decreases the reserve', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var balance = await web3.eth.getBalance(crucible.address);
    var reserve = await crucible.reserve();
    assert.equal(reserve.toNumber(), balance.toNumber(), 'reserve is correct');
    assert.equal(
      reserve.toNumber(),
      cu.riskAmountWei.times(3).toNumber(),
      'reserve is correct'
    );

    tx = await crucible.setGoal(
      address.user1, true, { 'from': address.oracle }
    );

    reserve = await crucible.reserve();
    assert.equal(
      reserve.toNumber(),
      cu.riskAmountWei.times(2).toNumber(),
      'reserve decreased'
    );

    tx = await crucible.setGoal(
      address.user2, false, { 'from': address.oracle }
    );

    reserve = await crucible.reserve();
    assert.equal(
      reserve.toNumber(),
      cu.riskAmountWei.times(1).toNumber(),
      'reserve decreased'
    );
  });

  it('setGoal throws error if we are not the owner', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await expectThrow(crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.user1 }
    ), EVMRevert);
  });

  it('setGoal state must be LOCKED or JUDGEMENT state', async () => {
    await expectThrow(crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    ), EVMRevert);
  });

  it('setGoal throws if participant does not exist', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await expectThrow(crucible.setGoal.sendTransaction(
      address.owner, true, { 'from': address.oracle }
    ), EVMRevert);
  });

  it('setGoal can only be called once for each paticipant', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    tx = await crucible.setGoal(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.setGoal(
      address.user2, false, { 'from': address.oracle }
    );

    for (var i = 1; i <= 2; i++) {
      await expectThrow(crucible.setGoal.sendTransaction(
        address['user' + i], true, { 'from': address.oracle }
      ), EVMRevert);

      await expectThrow(crucible.setGoal.sendTransaction(
        address['user' + i], false, { 'from': address.oracle }
      ), EVMRevert);
    }

  });

});
