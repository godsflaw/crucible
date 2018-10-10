const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

contract('Foundry - newCrucible', async (accounts) => {
  let cu;
  let address;
  let foundry;
  let oracle;

  beforeEach(async () => {
    var retry = true;

    cu = new CrucibleUtils();
    address = new Address();

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

    oracle = accounts[0];
  });

  afterEach(async () => {
  });

  it('make sure newCrucible works', async () => {
    var retry = true;

    while (retry) {
      try {
        retry = false;
        var crucible;

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

        truffleAssert.eventEmitted(tx, 'CrucibleCreated', async (ev) => {
          crucible = Crucible.at(ev.contractAddress);
        });

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
      } catch (err) {
        if (err.message === 'Error: nonce too low') {
          retry = true;
        }
      }
    }
  });
});
