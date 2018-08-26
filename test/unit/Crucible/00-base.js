const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

contract('Crucible - base', async (accounts) => {
  let address;
  let crucible;
  let startDate;
  let closeDate;
  let endDate;

  beforeEach(async () => {
    address = new Address();

    startDate = Math.floor(Date.now() / 1000);
    closeDate = Math.floor(addDays(Date.now(), 1) / 1000);
    endDate = Math.floor(addDays(Date.now(), 8) / 1000);

    crucible = await Crucible.new(
      address.oracle,
      'test',
      startDate,
      closeDate,
      endDate,
      250000000000000000,
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
      startDate,
      closeDate,
      endDate,
      250000000000000000,
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
    var startDate = await crucible.startDate.call();
    assert.equal(startDate.toNumber(), startDate, 'startDate is as expected');
  });

  it('verify the endDate is set', async () => {
    var endDate = await crucible.endDate.call();
    assert.equal(endDate.toNumber(), endDate, 'endDate is as expected');
  });

  it('verify the closeDate is set', async () => {
    var closeDate = await crucible.closeDate.call();
    assert.equal(closeDate.toNumber(), closeDate, 'closeDate is as expected');
  });

  it('verify the minimumAmount is set', async () => {
    var minimumAmount = await crucible.minimumAmount.call();
    assert.equal(
      minimumAmount.toNumber(),
      250000000000000000,
      'minimumAmount is as expected'
    );
  });

  it('startDate must be less than closeDate', async () => {
    try {
      var crucible = await Crucible.new(
        address.oracle,
        'startDate test',
        closeDate,
        startDate,
        endDate,
        250000000000000000,
        { from: address.oracle }
      );
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
        'startDate test',
        startDate,
        endDate,
        closeDate,
        250000000000000000,
        { from: address.oracle }
      );
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
        'startDate test',
        endDate,
        closeDate,
        startDate,
        250000000000000000,
        { from: address.oracle }
      );
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
        'startDate test',
        endDate,
        closeDate,
        startDate,
        0,
        { from: address.oracle }
      );
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });
});
