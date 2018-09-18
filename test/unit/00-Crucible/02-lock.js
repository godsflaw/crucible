const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - lock', async (accounts) => {
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

  it('lock changes crucible state to LOCKED', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
  });

  it('lock emits state change event', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock({ 'from': address.oracle });
    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsOpen(ev.fromState) &&
        cu.crucibleStateIsLocked(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('anyone can change crucible state to LOCKED', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.owner });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
  });

  it('excess money found on balance is moved to penalty', async () => {
    var penalty = await crucible.penalty.call();
    assert.equal(penalty.toNumber(), 0, 'penalty is correct');

    var tx = await web3.eth.sendTransaction({
      from: address.owner,
      to: crucible.address,
      value: cu.tooLowAmountWei,
    });

    penalty = await crucible.penalty.call();
    assert.equal(penalty.toNumber(), 0, 'penalty is correct');

    var reserve = await crucible.reserve.call();
    var balance = await web3.eth.getBalance(crucible.address);

    assert(
      reserve.plus(penalty).toNumber() < balance.toNumber(),
      'reserve + penalty is less than balance'
    );

    await cu.sleep(2000);

    tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');

    reserve = await crucible.reserve.call();
    penalty = await crucible.penalty.call();
    balance = await web3.eth.getBalance(crucible.address);

    assert.equal(penalty.toNumber(), cu.tooLowAmountWei, 'penalty is correct');

    assert.equal(
      reserve.plus(penalty).toNumber(),
      balance.toNumber(),
      'reserve + penalty is now the same as balance'
    );
  });

  it('lock only changes state if we are past lockDate', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await expectThrow(
      crucible.lock.sendTransaction({ 'from': address.oracle }), EVMRevert
    );
  });

  it('lock only changes state if we are in the OPEN state', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
    await expectThrow(
      crucible.lock.sendTransaction({ 'from': address.oracle }), EVMRevert
    );
  });

});
