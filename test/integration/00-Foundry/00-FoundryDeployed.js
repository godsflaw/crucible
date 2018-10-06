var Foundry = artifacts.require("./Foundry.sol");

contract('Foundry Deployed', async (accounts) => {
  var foundry;

  beforeEach(async () => {
    foundry = await Foundry.deployed();
  });

  afterEach(async () => {
    foundry.kill({ 'from': accounts[0] });
  });

  it('owner is correct', async () => {
    var owner = await foundry.owner();
    assert.equal(owner, accounts[0], 'owner is correct');
  });

  it('count is correct', async () => {
    var count = await foundry.getCount();
    assert.ok(count, 0, 'count is 0 crucibles');
  });
});
