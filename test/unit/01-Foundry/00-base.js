const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");

contract('Foundry - base', async (accounts) => {
  let address;
  let foundry;

  beforeEach(async () => {
    address = new Address();
    foundry = await Foundry.new({ from: address.owner });
  });

  afterEach(async () => {
  });

  it('has an address', async () => {
    assert.ok(foundry.address !== address.empty, 'has an address');
  });

});
