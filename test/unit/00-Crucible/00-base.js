const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - base', async (accounts) => {
  let cu;
  let address;
  let crucible;
  let startDate;
  let closeDate;
  let endDate;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();

    startDate = cu.startDate();
    closeDate = cu.closeDate();
    endDate = cu.endDate();

    crucible = await Crucible.new(
      address.oracle,
      'test',
      startDate,
      closeDate,
      endDate,
      cu.minAmountWei,
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
      'empty',
      cu.startDate(),
      cu.closeDate(),
      cu.endDate(),
      cu.minAmountWei,
      { from: address.oracle }
    );
    var oracle = await crucible.owner.call();
    assert.equal(
      oracle, address.oracle, 'empty address became oracle: ' + address.oracle
    );
  });

  it('verify the name is set', async () => {
    var name = await crucible.name.call();
    assert.equal(name, 'test', 'name = test expected');
  });

  it('verify the startDate is set', async () => {
    var _startDate = await crucible.startDate.call();
    assert.equal(_startDate.toNumber(), startDate, 'startDate is as expected');
  });

  it('verify the closeDate is set', async () => {
    var _closeDate = await crucible.closeDate.call();
    assert.equal(_closeDate.toNumber(), closeDate, 'closeDate is as expected');
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

  it('startDate must be less than closeDate', async () => {
    try {
      var crucible = await Crucible.new(
        address.oracle,
        'cu.startDate() test',
        cu.closeDate(),
        cu.startDate(),
        cu.endDate(),
        cu.minAmountWei,
        { from: address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('closeDate must be less than endDate', async () => {
    try {
      var crucible = await Crucible.new(
        address.oracle,
        'cu.startDate() test',
        cu.startDate(),
        cu.endDate(),
        cu.closeDate(),
        cu.minAmountWei,
        { from: address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('startDate must be less than endDate', async () => {
    try {
      var crucible = await Crucible.new(
        address.oracle,
        'cu.startDate() test',
        cu.endDate(),
        cu.closeDate(),
        cu.startDate(),
        cu.minAmountWei,
        { from: address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('minimumAmount must be greater than 0', async () => {
    try {
      var crucible = await Crucible.new(
        address.oracle,
        'cu.startDate() test',
        cu.endDate(),
        cu.closeDate(),
        cu.startDate(),
        0,
        { from: address.oracle }
      );
      assert(false, 'this call should throw an error');
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

  it('verify CrucibleState is OPEN', async () => {
    var state = await crucible.state.call();
    assert.equal(cu.crucibleStateIsOpen(state), true, 'state is OPEN');
  });

});
