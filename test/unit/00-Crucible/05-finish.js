const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
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
      'test',
      cu.startDate(),
      cu.lockDate(2),
      cu.endDate(4),
      cu.minAmountWei,
      { from: address.oracle }
    );

    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('finish changes crucible state to FINISHED', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
    await cu.sleep(2000);
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state');
  });

  it('finish exits clean if already in the FINISHED state', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
    await cu.sleep(2000);
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state');
    await cu.sleep(1000);
    tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsFinished(state), 'crucible is in the FINISHED state');
  });

  it('only oracle can change crucible state to FINISHED', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    try {
      var state = await crucible.state.call();
      assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
      await cu.sleep(2000);
      tx = await crucible.finish.sendTransaction({ 'from': address.user1 });
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('finish only changes state if we are past endDate', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    try {
      var state = await crucible.state.call();
      assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
      tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('finish only changes state from LOCKED to FINISHED', async () => {
    try {
      var state = await crucible.state.call();
      assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
      tx = await crucible.finish.sendTransaction({ 'from': address.oracle });
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
