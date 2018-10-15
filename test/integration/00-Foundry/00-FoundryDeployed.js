const Foundry = artifacts.require("./Foundry.sol");

contract('Foundry - Deployed', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    foundry = await Foundry.at(process.env.FOUNDRY_PROXY);
  });

  afterEach(async () => {
  });

  it('owner is 0x7af77b0d604d13a41e6d0f2175d8a61d5f1115c9', async () => {
    // this will fail on the first run after init, but will work after that
    var owner = await foundry.owner.call();
    assert.equal(
      owner, '0x7af77b0d604d13a41e6d0f2175d8a61d5f1115c9',  'owner is correct'
    );
  });

  it('count is greater than 0', async () => {
    // this will fail on the first run after init, but will work after that
    var count = await foundry.getCount();
    assert.ok(count.toNumber() > 0, 'count is greater than 0');
  });
});
