const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - version', async (accounts) => {
  let cu;
  let address;
  let foundry;
  let oracle;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();
    foundry = await Foundry.at(process.env.FOUNDRY_PROXY);
    oracle = accounts[0];
  });

  afterEach(async () => {
  });

  it('check that crucible version exists and is correct', async () => {
    var retry = true;

    while (retry) {
      try {
        retry = false
        var crucible;

        var tx = await foundry.newCrucible(
          oracle,
          address.empty,
          cu.startDate(),
          cu.lockDate(),
          cu.endDate(),
          cu.minAmountWei,
          cu.timeout,
          cu.feeNumerator,
          { 'from': oracle }
        );

        truffleAssert.eventEmitted(tx, 'CrucibleCreated', async (ev) => {
          crucible = Crucible.at(ev.contractAddress);
        });

        var version = await crucible.version.call();
        assert.match(web3.toAscii(version), /0.0.1/, 'got correct version');
      } catch (err) {
        if (err.message === 'Error: nonce too low') {
          retry = true;
        }
      }
    }
  });
});
