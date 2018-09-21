const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - kill', async (accounts) => {
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
  });

  it('kill calls selfdestruct on the contract', async () => {
    var tx = await crucible.payout.sendTransaction(
      0, 3, { 'from': address.oracle }
    );

    var owner = await crucible.owner();
    assert.equal(owner, address.oracle, 'crucible.owner is the oralce');

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsPaid(state), 'crucible is in the PAID state'
    );

    await crucible.kill({ from: address.oracle });

    await expectThrow(crucible.owner());
  });

  it('kill will not call selfdestruct on the contract', async () => {
    var tx = await crucible.payout.sendTransaction(
      0, 2, { 'from': address.oracle }
    );

    var owner = await crucible.owner();
    assert.equal(owner, address.oracle, 'crucible.owner is the oralce');

    var state = await crucible.state.call();
    assert(
      cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state'
    );

    await crucible.kill({ from: address.oracle });

    owner = await crucible.owner();
    assert.equal(owner, address.oracle, 'crucible.owner is still the oralce');
  });

});
