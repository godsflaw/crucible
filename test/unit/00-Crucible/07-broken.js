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
      'test',
      cu.startDate(),
      cu.lockDate(2),
      cu.endDate(10),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

//  it('broken changes crucible state to BROKEN', async () => {
//    var state = await crucible.state.call();
//    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
//    await cu.sleep(2000);
//    var tx = await crucible.broken.sendTransaction({ 'from': address.oracle });
//    state = await crucible.state.call();
//    assert(cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state');
//  });
//
//  it('broken emits state change event', async () => {
//    await cu.sleep(2000);
//    var tx = await crucible.broken({ 'from': address.oracle });
//    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
//      return cu.crucibleStateIsOpen(ev.fromState) &&
//        cu.crucibleStateIsBroken(ev.toState);
//    }, 'fromState and toState are correct');
//  });
//
//  it('anyone can change crucible state to BROKEN', async () => {
//    var state = await crucible.state.call();
//    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
//    await cu.sleep(2000);
//    var tx = await crucible.broken.sendTransaction({ 'from': address.owner });
//    state = await crucible.state.call();
//    assert(cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state');
//  });

  it('broken only changes state if we are timeout past endDate', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await expectThrow(
      crucible.broken.sendTransaction({ 'from': address.oracle }), EVMRevert
    );
  });

//  it('broken only changes state if we are in the OPEN state', async () => {
//    var state = await crucible.state.call();
//    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
//    await cu.sleep(2000);
//    var tx = await crucible.broken.sendTransaction({ 'from': address.oracle });
//    state = await crucible.state.call();
//    assert(cu.crucibleStateIsBroken(state), 'crucible is in the BROKEN state');
//    await expectThrow(
//      crucible.broken.sendTransaction({ 'from': address.oracle }), EVMRevert
//    );
//  });

});
