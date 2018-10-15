const Foundry = artifacts.require("./Foundry.sol");

contract('Foundry - Deployed', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    retry = false;
    foundry = await Foundry.at(process.env.FOUNDRY_PROXY);
  });

  afterEach(async () => {
  });

  it('owner is 0xb8bbf36ba36fc78f3f137c514af33709fffba604', async () => {
    // this will fail on the first run after init, but will work after that
    var owner = await foundry.owner();
    assert.equal(
      owner, '0xb8bbf36ba36fc78f3f137c514af33709fffba604', 'owner is correct'
    );
  });
});
