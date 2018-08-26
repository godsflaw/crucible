const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

contract('Foundry - getCount', async (accounts) => {
  let address;
  let foundry;
  let startDate;
  let closeDate;
  let endDate;

  beforeEach(async () => {
    address = new Address();
    foundry = await Foundry.new({ from: address.owner });
    startDate = Math.floor(Date.now() / 1000);
    closeDate = Math.floor(addDays(Date.now(), 1) / 1000);
    endDate = Math.floor(addDays(Date.now(), 8) / 1000);
  });

  afterEach(async () => {
    await foundry.kill({ from: address.owner });
  });

  it('Factory should start with 0 Crucibles', async () => {
    var result = await foundry.getCount.call();
    var crucibleCount = result.toNumber();
    assert.equal(crucibleCount, 0, 'got correct crucibleCount');
  });

  it('new Crucible count is correct', async () => {
    await foundry.newCrucible(
      address.oracle,
      'test01',
      startDate,
      closeDate,
      endDate,
      250000000000000000
    );

    await foundry.newCrucible(
      address.oracle,
      'test02',
      startDate,
      closeDate,
      endDate,
      250000000000000000
    );

    var result = await foundry.getCount.call();
    var crucibleCount = result.toNumber();
    assert.equal(crucibleCount, 2, 'got correct crucibleCount');

    await foundry.newCrucible(
      address.oracle,
      'test03',
      startDate,
      closeDate,
      endDate,
      250000000000000000
    );

    result = await foundry.getCount.call();
    crucibleCount = result.toNumber();
    assert.equal(crucibleCount, 3, 'got correct crucibleCount');
  });
});
