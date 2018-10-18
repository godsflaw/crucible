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
    assert.equal(web3.toUtf8(version).trim(), '1.0.11', 'got correct version');
  });
});
