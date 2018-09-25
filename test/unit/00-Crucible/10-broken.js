const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - broken', async (accounts) => {
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
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('broken can change crucible state to BROKEN', async () => {
    var tx;
    await cu.sleep(2000);

    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await cu.sleep(2000);

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    await cu.sleep(5000);

    tx = await crucible.broken.sendTransaction(
      { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state'
    );
  });

  it('BROKEN state change emits event', async () => {
    var tx;
    await cu.sleep(2000);

    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await cu.sleep(2000);

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    await cu.sleep(5000);

    tx = await crucible.broken(
      { 'from': address.oracle }
    );

    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsFinished(ev.fromState) &&
        cu.crucibleStateIsBroken(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('anyone can call broken()', async () => {
    var tx;
    await cu.sleep(2000);

    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await cu.sleep(2000);

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    await cu.sleep(5000);

    tx = await crucible.broken.sendTransaction(
      { 'from': address.user1 }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state'
    );
  });

  it('broken will not work until timeout', async () => {
    var tx;
    await cu.sleep(2000);
    tx = await crucible.lock.sendTransaction({ 'from': address.user1 });
    await cu.sleep(2000);
    tx = await crucible.judgement.sendTransaction({ 'from': address.user1 });

    // we didn't wait for timeout here.
    await expectThrow(crucible.broken.sendTransaction(
      { 'from': address.user1 }
    ), EVMRevert);

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsJudgement(state),
      'crucible is still in the JUDGEMENT state'
    );
  });

  it('broken will not work in the PAID state', async () => {
    var tx;
    await cu.sleep(2000);

    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user2, false, { 'from': address.oracle }
    );

    await cu.sleep(2000);

    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    tx = await crucible.setGoal.sendTransaction(
      address.user1, true, { 'from': address.oracle }
    );

    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });

    tx = await crucible.payout(
      0, 3, { 'from': address.oracle }
    );

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );

    await cu.sleep(5000);

    // already in the final state (PAID)
    await expectThrow(crucible.broken.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);

    state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );
  });

});
