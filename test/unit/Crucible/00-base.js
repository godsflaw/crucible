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
  let endDate;
  let closeDate;

  beforeEach(async () => {
    address = new Address();
    startDate = Math.floor(Date.now() / 1000);
    endDate = Math.floor(addDays(Date.now(), 8) / 1000);
    closeDate = Math.floor(addDays(Date.now(), 1) / 1000);
    crucible = await Crucible.new(
      address.oracle, 'test', startDate, endDate, closeDate, { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('should verify the owner/oracle', async () => {
    var oracle = await crucible.owner.call();
    assert.equal(oracle, address.oracle, 'got oracle: ' + address.oracle);
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
});
