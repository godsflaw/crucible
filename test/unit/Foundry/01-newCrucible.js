const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

contract('Foundry - newCrucible', async (accounts) => {
  let address;
  let foundry;
  let startDate;
  let closeDate;
  let endDate;

  beforeEach(async () => {
    address = new Address();
    foundry = await Foundry.new({ from: address.owner });
    startDate = Math.floor(Date.now() / 1000);
    closeDate = Math.floor(addDays(Date.now(), 1) / 1000);
    endDate = Math.floor(addDays(Date.now(), 8) / 1000);
  });

  afterEach(async () => {
    await foundry.kill({ from: address.owner });
  });

  it('call Factory and check the new Crucible values', async () => {
    var crucible;

    var tx = await foundry.newCrucible(
      address.oracle, 'deadbeef', startDate, closeDate, endDate
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', async (ev) => {
      crucible = Crucible.at(ev.contractAddress);
    });

    var owner = await crucible.owner.call();
    assert.equal(
      owner, address.oracle, 'got crucible owner: ' + address.oracle
    );

    var name = await crucible.name.call();
    assert.equal(name.toString(), 'deadbeef', 'got crucible name');

    // try to get at the new contract from index 0 in the array.
    owner = undefined;
    name = undefined;
    crucible = undefined;

    var result = await foundry.getCount.call();

    var crucibleAddr = await foundry.crucibles.call(0);
    crucible = Crucible.at(crucibleAddr);

    owner = await crucible.owner.call();
    assert.equal(
      owner, address.oracle, 'got crucible owner: ' + address.oracle
    );

    name = await crucible.name.call();
    assert.equal(name.toString(), 'deadbeef', 'got crucible name');
  });
});
