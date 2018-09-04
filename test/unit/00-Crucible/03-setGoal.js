const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
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
      'test',
      cu.startDate(),
      cu.lockDate(1),
      cu.endDate(3),
      cu.minAmountWei,
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('setGoal works for PASS and FAIL', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    var commitment = await crucible.commitments.call(address.user1);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmounttWei, 'risk correct');
    assert.equal(
      cu.goalStateIsPass(commitment[2]), true, 'goal in pass state'
    );

    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    commitment = await crucible.commitments.call(address.user2);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmounttWei, 'risk correct');
    assert.equal(
      cu.goalStateIsFail(commitment[2]), true, 'goal in fail state'
    );

  });

  it('setGoal throws error if we are not the owner', async () => {
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    try {
      tx = await crucible.setGoal.sendTransaction(
        address.user1, true, { 'from': address.user1 }
      );
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('setGoal state must be LOCKED', async () => {
    try {
      tx = await crucible.setGoal.sendTransaction(
        address.user1, true, { 'from': address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
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

    try {
      tx = await crucible.setGoal.sendTransaction(
        address.user3, true, { 'from': address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

});
