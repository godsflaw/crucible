const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - addParticipant', async (accounts) => {
  let cu;
  let address;
  let crucible;
  let startDate;
  let closeDate;
  let endDate;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();

    startDate = Math.floor(Date.now() / 1000);
    closeDate = Math.floor(cu.addDays(Date.now(), 1) / 1000);
    endDate = Math.floor(cu.addDays(Date.now(), 8) / 1000);

    crucible = await Crucible.new(
      address.oracle,
      'test',
      startDate,
      closeDate,
      endDate,
      250000000000000000,
      { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('should verify the owner/oracle', async () => {
    var oracle = await crucible.owner.call();
    assert.equal(oracle, address.oracle, 'got oracle: ' + address.oracle);
  });

});
