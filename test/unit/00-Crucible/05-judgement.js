const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - judgement', async (accounts) => {
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

  it('judgement changes crucible state to JUDGEMENT', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
    await cu.sleep(2000);
    tx = await crucible.judgement.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(
      cu.crucibleStateIsJudgement(state), 'crucible is in the JUDGEMENT state'
    );
  });

  it('judgement emits state change event', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    await cu.sleep(2000);

    tx = await crucible.judgement({ 'from': address.oracle });
    truffleAssert.eventEmitted(tx, 'CrucibleStateChange', (ev) => {
      return cu.crucibleStateIsLocked(ev.fromState) &&
        cu.crucibleStateIsJudgement(ev.toState);
    }, 'fromState and toState are correct');
  });

  it('only oracle can change crucible state to JUDGEMENT', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });

    var state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');
    await cu.sleep(2000);

    await expectThrow(crucible.judgement.sendTransaction(
      { 'from': address.user1 }
    ), EVMRevert);
  });

  it('judgement only changes state if we are past endDate', async () => {
    await cu.sleep(2000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');

    await expectThrow(crucible.judgement.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);
  });

  it('judgement only changes state from LOCKED to JUDGEMENT', async () => {
    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');

    await expectThrow(crucible.judgement.sendTransaction(
      { 'from': address.oracle }
    ), EVMRevert);
  });

});
