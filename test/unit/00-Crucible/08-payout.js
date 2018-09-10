const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - payout', async (accounts) => {
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
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
    var tx2 = await cu.add(crucible, 'user3');

    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await cu.sleep(2000);
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('cannot payout in LOCKED state', async () => {
    var count = await crucible.count();
    await expectThrow(
      crucible.payout.sendTransaction(0, count, { 'from': address.oracle }
    ), EVMRevert);
  });

//  it('can payout with all users passing', async () => {
//    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
//    state = await crucible.state.call();
//    assert(cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state');
//
//    var count = await crucible.count.call();
//    tx = await crucible.payout.sendTransaction(0, count, { 'from': address.oracle });
//    console.log(tx);
//    state = await crucible.state.call();
//    assert(cu.crucibleStateIsPaid(state), 'crucible is in the PAID state');
//  });

});
