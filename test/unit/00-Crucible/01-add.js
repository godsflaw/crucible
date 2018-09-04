const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - add', async (accounts) => {
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
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('user can participate', async () => {
    var tx = await cu.add(crucible, 'user1');

    var participant = await crucible.participants.call(0);
    assert.equal(participant, address.user1, 'first participant is user1');

    var commitment = await crucible.commitments.call(participant);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmounttWei, 'risk correct');
    assert.equal(
      cu.goalStateIsWaiting(commitment[2]), true, 'goal in waiting state'
    );
    assert.deepEqual(
      await web3.eth.getBalance(crucible.address),
      cu.riskAmounttWei,
      'contract balance is as expected'
    );
  });

  it('owner can add participant', async () => {
    var tx = await cu.addBySender(crucible, 'oracle', 'user1');

    var participant = await crucible.participants.call(0);
    assert.equal(participant, address.user1, 'first participant is user1');

    var commitment = await crucible.commitments.call(participant);
    assert.equal(commitment[0], true, 'record exists');
    assert.equal(commitment[1].toNumber(), cu.riskAmounttWei, 'risk correct');
    assert.equal(
      cu.goalStateIsWaiting(commitment[2]), true, 'goal in waiting state'
    );
    assert.deepEqual(
      await web3.eth.getBalance(crucible.address),
      cu.riskAmounttWei,
      'contract balance is as expected'
    );
  });

  it('can add many participants', async () => {
    var balance = cu.zeroAmountWei;

    for (i = 1; i <= 3; i++) {
      var tx = await cu.add(crucible, 'user' + i);

      var participant = await crucible.participants.call(i - 1);
      assert.equal(participant, address['user' + i], 'first participant is user' + i);

      var commitment = await crucible.commitments.call(participant);
      assert.equal(commitment[0], true, 'record exists');
      assert.equal(commitment[1].toNumber(), cu.riskAmounttWei, 'risk correct');
      assert.equal(
        cu.goalStateIsWaiting(commitment[2]), true, 'goal in waiting state'
      );
      balance = balance.plus(cu.riskAmounttWei);
      assert.deepEqual(
        await web3.eth.getBalance(crucible.address),
        balance,
        'contract balance is as expected'
      );
    }

    assert.equal(
      web3.fromWei(balance, 'ether').toNumber(), 1.5, 'ETH balance correct'
    );
  });

  it('add participant with amount below minAmount', async () => {
    try {
      var tx = await cu.add(crucible, 'user1', cu.tooLowAmountWei);
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('cannot add participant that already exists', async () => {
    // note: a test for crucible.participantExists() is not needed because
    // all cases are tested here.
    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
    var tx3 = await cu.add(crucible, 'user3');

    try {
      var tx4 = await cu.add(crucible, 'user1');
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('users cannot add other users', async () => {
    try {
      var tx = await cu.addBySender(crucible, 'user1', 'user2');
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('cannot add user in locked state', async () => {
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
    state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(1000);
    var tx3 = await crucible.lock.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');

    try {
      var tx3 = await cu.add(crucible, 'user3');
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

});
