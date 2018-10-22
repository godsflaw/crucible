const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');
const web3AsynWrapper = require('../../fixtures/web3asyncwrapper');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

const getCode = web3AsynWrapper(web3.eth.getCode);

contract('Foundry - newCrucible', async (accounts) => {
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

  it('make sure newCrucible works', async () => {
    var crucible;
    var contractAddress;

    var beforeCount = await foundry.getCount();

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

    var owner = await crucible.owner.call();
    assert.equal(owner, oracle, 'got crucible owner: ' + oracle);

    var beneficiary = await crucible.beneficiary.call();
    assert.equal(beneficiary, address.empty, 'got crucible beneficiary');

    var count = await foundry.getCount();
    assert.equal(
      count.toNumber(),
      beforeCount.toNumber() + 1,
      'count incremented'
    );

    // try to get at the new contract from index 0 in the array.
    owner = undefined;
    beneficiary = undefined;
    crucible = undefined;

    var crucibleAddr = await foundry.crucibles.call(0);
    crucible = Crucible.at(crucibleAddr);

    owner = await crucible.owner.call();
    assert.equal(owner, oracle, 'got crucible owner: ' + oracle);

    beneficiary = await crucible.beneficiary.call();
    assert.equal(beneficiary, address.empty, 'got crucible beneficiary');
  });
});
