const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - paid', async (accounts) => {
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
      cu.lockDate(2),
      cu.endDate(4),
      cu.minAmountWei,
      5,
      cu.feeNumerator,
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
    var tx3 = await cu.add(crucible, 'user3');

    await cu.sleep(2000);

    var tx4 = await crucible.lock.sendTransaction({ 'from': address.oracle });
    var tx5 = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await cu.sleep(2000);

    var tx6 = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    var tx7 = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    var tx8 = await crucible.finish.sendTransaction({ 'from': address.oracle });
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('payout + collectFee can change crucible state to PAID', async () => {
    var tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );
  });

  it('collectFee + payout can change crucible state to PAID', async () => {
    var tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );

    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );
  });

  it('payout only changes crucible state to PAID when compete', async () => {
    var state;
    var tx;

    for (i = 0; i < 2; i++) {
      tx = await crucible.payout.sendTransaction(
        i, 1, { 'from': address.oracle }
      );

      state = await crucible.state.call();
      assert(
        cu.crucibleStateIsFinished(state), 'crucible is in the Finished state'
      );
    }

    tx = await crucible.collectFee.sendTransaction(
      address.oracle, { 'from': address.oracle }
    );

    state = await crucible.state.call();
    assert(
      cu.crucibleStateIsFinished(state), 'crucible is in the Finished state'
    );

    tx = await crucible.payout.sendTransaction(
      2, 1, { 'from': address.oracle }
    );

    state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );
  });

  it('payout emits event state change event', async () => {
    var tx = await crucible.collectFee(
      address.oracle, { 'from': address.oracle }
    );

    tx = await crucible.payout(
      0, 3, { 'from': address.oracle }
    );

    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsFinished(ev.fromState) &&
        cu.crucibleStateIsPaid(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('collectFee emits event state change event', async () => {
    var tx = await crucible.payout(
      0, 3, { 'from': address.oracle }
    );

    tx = await crucible.collectFee(
      address.oracle, { 'from': address.oracle }
    );

    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsFinished(ev.fromState) &&
        cu.crucibleStateIsPaid(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('anyone can call paid()', async () => {
    var tx = await crucible.paid.sendTransaction(
      { 'from': address.user1 }
    );
  });

  it('paid can change state from FINISHED to PAID', async () => {
    var tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    tx = await crucible.collectFee(
      address.oracle, { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );

    await expectThrow(crucible.paid.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);
  });

  it('paid can change state from BROKEN to PAID', async () => {
    await cu.sleep(5000);

    var tx = await crucible.broken.sendTransaction(
      { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state'
    );

    tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    tx = await crucible.collectFee(
      address.oracle, { 'from': address.oracle }
    );

    state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );

    await expectThrow(crucible.paid.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);
  });

});
