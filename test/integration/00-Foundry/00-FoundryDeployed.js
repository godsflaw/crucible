const Foundry = artifacts.require("./Foundry.sol");

contract('Foundry - Deployed', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    var retry = true;

    while (retry) {
      try {
        retry = false;
        foundry = await Foundry.at(process.env.FOUNDRY_PROXY);
      } catch (err) {
        if (err.message === 'Error: nonce too low') {
          retry = true;
        }
      }
    }
  });

  afterEach(async () => {
  });

  it('count is greater than 0', async () => {
    // this will fail on the first run after init, but will work after that
    var count = await foundry.getCount();
    assert.ok(count.toNumber() > 0, 'count is greater than 0');
  });
});
