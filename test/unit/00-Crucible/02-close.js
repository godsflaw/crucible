const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - close', async (accounts) => {
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
      cu.closeDate(2),
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

  it('close changes crucible state to CLOSED', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(2000);
    var tx = await crucible.close.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsClosed(state), 'crucible is in the CLOSED state');
  });

  it('anyone can change crucible state to CLOSED', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(2000);
    var tx = await crucible.close.sendTransaction({ 'from': address.owner });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsClosed(state), 'crucible is in the CLOSED state');
  });

  it('close only changes state if we are past closeDate', async () => {
    try {
      var state = await crucible.state.call();
      assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
      var tx = await crucible.close.sendTransaction({ 'from': address.oracle });
      assert(false, 'this call should throw an error');
    } catch(err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('close only changes state if we are in the OPEN state', async () => {
    try {
      var state = await crucible.state.call();
      assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
      await cu.sleep(2000);
      var tx = await crucible.close.sendTransaction({ 'from': address.oracle });
      state = await crucible.state.call();
      assert(cu.crucibleStateIsClosed(state), 'crucible is in the CLOSED state');
      tx = await crucible.close.sendTransaction({ 'from': address.oracle });
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
