const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - base', async (accounts) => {
  let cu;
  let address;
  let crucible;
  let startDate;
  let lockDate;
  let endDate;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();

    startDate = cu.startDate();
    lockDate = cu.lockDate();
    endDate = cu.endDate();

    crucible = await Crucible.new(
      address.oracle,
      address.empty,
      startDate,
      lockDate,
      endDate,
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('should verify the owner/oracle', async () => {
    var oracle = await crucible.owner.call();
    assert.equal(oracle, address.oracle, 'got oracle: ' + address.oracle);
  });

  it('verify the owner/oracle is set to msg.sender if 0x0', async () => {
    var crucible = await Crucible.new(
      address.empty,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );
    var oracle = await crucible.owner.call();
    assert.equal(
      oracle, address.oracle, 'empty address became oracle: ' + address.oracle
    );
  });

  it('verify the beneficiary is set correctly', async () => {
    var crucible = await Crucible.new(
      address.oracle,
      address.owner,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    );
    var beneficiary = await crucible.beneficiary.call();
    assert.equal(
      beneficiary, address.owner, 'beneficiary is: ' + address.owner
    );
  });

  it('verify the beneficiary is set', async () => {
    var beneficiary = await crucible.beneficiary.call();
    assert.equal(beneficiary, address.empty, 'beneficiary as expected');
  });

  it('verify passCount is set', async () => {
    var passCount = await crucible.passCount.call();
    assert.equal(passCount, 0, 'passCount is false');
  });

  it('verify reserve is set', async () => {
    var reserve = await crucible.reserve.call();
    assert.equal(reserve, 0, 'reserve is 0');
  });

  it('verify trackingBalance is set', async () => {
    var trackingBalance = await crucible.trackingBalance.call();
    assert.equal(trackingBalance, 0, 'trackingBalance is 0');
  });

  it('verify feePaid is set', async () => {
    var feePaid = await crucible.feePaid.call();
    assert.equal(feePaid, false, 'feePaid is false');
  });

  it('verify penaltyPaid is set', async () => {
    var penaltyPaid = await crucible.penaltyPaid.call();
    assert.equal(penaltyPaid, false, 'penaltyPaid is false');
  });

  it('verify timeout is set', async () => {
    var timeout = await crucible.timeout.call();
    assert.equal(
      timeout, (endDate - startDate), 'timeout is correct'
    );
  });

  it('verify feeNumerator is set', async () => {
    var feeNumerator = await crucible.feeNumerator.call();
    assert.equal(
      feeNumerator, cu.feeNumerator, 'feeNumerator is correct'
    );
  });

  it('verify feeDenominator is set', async () => {
    var feeDenominator = await crucible.feeDenominator.call();
    assert.equal(
      feeDenominator.toNumber(), 1000, 'feeDenominator is correct'
    );
  });

  it('verify calculateFee is set', async () => {
    var calculateFee = await crucible.calculateFee.call();
    assert.equal(calculateFee, false, 'calculateFee is false');
  });

  it('verify the startDate is set', async () => {
    var _startDate = await crucible.startDate.call();
    assert.equal(_startDate.toNumber(), startDate, 'startDate is as expected');
  });

  it('verify the lockDate is set', async () => {
    var _lockDate = await crucible.lockDate.call();
    assert.equal(_lockDate.toNumber(), lockDate, 'lockDate is as expected');
  });

  it('verify the endDate is set', async () => {
    var _endDate = await crucible.endDate.call();
    assert.equal(_endDate.toNumber(), endDate, 'endDate is as expected');
  });

  it('verify the minimumAmount is set', async () => {
    var minimumAmount = await crucible.minimumAmount.call();
    assert.equal(
      minimumAmount.toNumber(),
      cu.minAmountWei,
      'minimumAmount is as expected'
    );
  });

  it('startDate must be less than lockDate', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      address.empty,
      cu.lockDate(),
      cu.startDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('lockDate must be less than endDate', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.endDate(),
      cu.lockDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('startDate must be less than endDate', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      address.empty,
      cu.endDate(),
      cu.lockDate(),
      cu.startDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('minimumAmount must be greater than 0', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      address.empty,
      cu.endDate(),
      cu.lockDate(),
      cu.startDate(),
      0,
      cu.timeout,
      cu.feeNumerator,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('timeout must be greater than to (endDate - startDate)', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      address.empty,
      cu.endDate(),
      cu.lockDate(),
      cu.startDate(),
      cu.endDate(),
      (cu.endDate() - cu.startDate()) - 1,
      cu.feeNumerator,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('verify CrucibleState is OPEN', async () => {
    var state = await crucible.state.call();
    assert.equal(cu.crucibleStateIsOpen(state), true, 'state is OPEN');
  });

  it('verify released is 0', async () => {
    var released = await crucible.released.call();
    assert.equal(released.toNumber(), 0, 'released is 0');
  });

  it('payable fallback function works', async () => {
    var balance = await web3.eth.getBalance(crucible.address);
    assert.equal(balance.toNumber(), 0, 'balance is 0');

    var tx = await web3.eth.sendTransaction({
      from: address.owner,
      to: crucible.address,
      value: cu.tooLowAmountWei,
    });

    balance = await web3.eth.getBalance(crucible.address);
    assert.equal( balance.toNumber(), cu.tooLowAmountWei, 'balance is .01 ETH');
  });

  it('payable fallback function emits event', async () => {
    var tx = await web3.eth.sendTransaction({
      from: address.owner,
      to: crucible.address,
      value: cu.tooLowAmountWei,
    });

    var result = await truffleAssert.createTransactionResult(crucible, tx);
    truffleAssert.eventEmitted(result, 'FundsReceivedPayable', (ev) => {
      return ev.fromAddress === address.owner &&
        ev.amount.toNumber() === cu.tooLowAmountWei.toNumber();
    }, 'event fired and fromAddress and amount are correct');
  });

  it('payable fallback stays under gas stipend of 2,300', async () => {
    var tx = await web3.eth.sendTransaction({
      from: address.owner,
      to: crucible.address,
      value: cu.tooLowAmountWei,
    });

    cu.assertTxUnderGasStipend(tx);
  });

  it('payable fallback only works while OPEN', async () => {
    crucible = await Crucible.new(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(1),
      cu.endDate(3),
      cu.minAmountWei,
      10,
      cu.feeNumerator,
      { from: address.oracle }
    );

    var state = await crucible.state.call();
    assert(cu.crucibleStateIsOpen(state), 'crucible is in the OPEN state');
    await cu.sleep(1000);
    var tx = await crucible.lock.sendTransaction({ 'from': address.oracle });
    state = await crucible.state.call();
    assert(cu.crucibleStateIsLocked(state), 'crucible is in the LOCKED state');

    try {
      await web3.eth.sendTransaction({
        from: address.owner,
        to: crucible.address,
        value: cu.tooLowAmountWei,
      });
      assert(false, 'did not throw an error');
    } catch (err) {
      assert.match(
        err.message,
        /revert/,
        'fallback function should revert since we are not in OPEN state'
      );
    }
  });

});
