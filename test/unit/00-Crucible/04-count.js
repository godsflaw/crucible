const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - count', async (accounts) => {
  let cu;
  let address;
  let crucible;

  beforeEach(async () => {
    address = new Address();
    cu = new CrucibleUtils(address);

    crucible = await Crucible.new(
      address.oracle,
      'test',
      cu.startDate(),
      cu.closeDate(1),
      cu.endDate(3),
      cu.minAmountWei,
      { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('count returns 0 commitments', async () => {
    var count = await crucible.count.call();
    assert.equal(count.toNumber(), 0, 'no commitments yet');
  });

  it('count returns commitments', async () => {
    var tx1 = await cu.add(crucible, 'user1');
    var tx2 = await cu.add(crucible, 'user2');
    var count = await crucible.count.call();
    assert.equal(count.toNumber(), 2, 'two commitments');
  });

});
