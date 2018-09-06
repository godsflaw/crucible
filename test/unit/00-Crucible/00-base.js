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
      'test',
      startDate,
      lockDate,
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
      cu.lockDate(),
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
      'cu.startDate() test',
      cu.lockDate(),
      cu.startDate(),
      cu.endDate(),
      cu.minAmountWei,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('lockDate must be less than endDate', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      'cu.startDate() test',
      cu.startDate(),
      cu.endDate(),
      cu.lockDate(),
      cu.minAmountWei,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('startDate must be less than endDate', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      'cu.startDate() test',
      cu.endDate(),
      cu.lockDate(),
      cu.startDate(),
      cu.minAmountWei,
      { from: address.oracle }
    ), EVMRevert);
  });

  it('minimumAmount must be greater than 0', async () => {
    await expectThrow(Crucible.new(
      address.oracle,
      'cu.startDate() test',
      cu.endDate(),
      cu.lockDate(),
      cu.startDate(),
      0,
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

});
