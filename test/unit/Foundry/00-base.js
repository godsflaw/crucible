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
    await foundry.kill({ from: address.owner });
  });

  it('should verify the owner', async () => {
    var owner = await foundry.owner.call();
    assert.equal(owner, address.owner, 'got owner: ' + address.owner);
  });
});
