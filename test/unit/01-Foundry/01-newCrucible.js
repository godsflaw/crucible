const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

contract('Foundry - newCrucible', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();
    foundry = await Foundry.new({ from: address.owner });
  });

  afterEach(async () => {
    await foundry.kill({ from: address.owner });
  });

  it('call Factory and check the new Crucible values', async () => {
    var crucible;

    var tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', async (ev) => {
      crucible = Crucible.at(ev.contractAddress);
    });

    var owner = await crucible.owner.call();
    assert.equal(
      owner, address.oracle, 'got crucible owner: ' + address.oracle
    );

    var beneficiary = await crucible.beneficiary.call();
    assert.equal(beneficiary, address.empty, 'got crucible beneficiary');

    // try to get at the new contract from index 0 in the array.
    owner = undefined;
    beneficiary = undefined;
    crucible = undefined;

    var result = await foundry.getCount.call();

    var crucibleAddr = await foundry.crucibles.call(0);
    crucible = Crucible.at(crucibleAddr);

    owner = await crucible.owner.call();
    assert.equal(
      owner, address.oracle, 'got crucible owner: ' + address.oracle
    );

    beneficiary = await crucible.beneficiary.call();
    assert.equal(beneficiary, address.empty, 'got crucible beneficiary');
  });
});
