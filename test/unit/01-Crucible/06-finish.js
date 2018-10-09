const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - finish', async (accounts) => {
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
      cu.timeout,
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
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('finish changes crucible state to FINISHED', async () => {
    var tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state'
    );
  });

  it('finish emits state change event', async () => {
    var tx = await crucible.finish({ 'from': address.oracle });
    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state'
    );
    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsJudgement(ev.fromState) &&
        cu.crucibleStateIsFinished(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('only oracle can change crucible state to FINISHED', async () => {
    await expectThrow(crucible.finish.sendTransaction(
      { 'from': address.user1 }
    ), EVMRevert);
  });

  it('finish only changes state from LOCKED to FINISHED', async () => {
    var tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state'
    );
    await expectThrow(crucible.finish.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);
  });

});
