const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');
const web3AsynWrapper = require('../../fixtures/web3asyncwrapper');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

const getCode = web3AsynWrapper(web3.eth.getCode);

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
    var contractAddress;

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      contractAddress = ev.contractAddress;
      return (contractAddress === ev.contractAddress);
    });

    // hacky way to wait until the contract is mined
    while (crucible === undefined) {
      var code = await getCode(contractAddress);
      if (code !== '0x') {
        crucible = await Crucible.at(contractAddress);
      } else {
        cu.sleep(500);
      }
    }

    var version = await crucible.version.call();
    assert.equal(web3.toUtf8(version).trim(), '1.0.13', 'got correct version');
  });
});
