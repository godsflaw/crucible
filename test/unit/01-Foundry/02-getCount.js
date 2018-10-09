const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

contract('Foundry - getCount', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();

    foundry = await Foundry.new({ from: address.owner });
  });

  afterEach(async () => {
  });

  it('Factory should start with 0 Crucibles', async () => {
    var count = await foundry.getCount();
    assert.equal(count.toNumber(), 0, 'got correct count');
  });

  it('new Crucible count is correct', async () => {
    await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');

    await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');
  });
});
