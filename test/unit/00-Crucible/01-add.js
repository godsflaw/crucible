const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const truffleAssert = require('truffle-assertions');

const Crucible = artifacts.require("./Crucible.sol");

contract('Crucible - add', async (accounts) => {
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
      cu.closeDate(),
      cu.endDate(),
      cu.minAmountWei,
      { from: address.oracle }
    );
  });

  afterEach(async () => {
    await crucible.kill({ from: address.oracle });
  });

  it('can add participant', async () => {
    var tx = await cu.add(crucible, 'user1');

    var participant = await crucible.participants.call(0);
    assert.equal(participant, address.user1, 'first participant is user1');

    var commitment = await crucible.commitments.call(participant);
    assert.equal(commitment[0].toNumber(), cu.riskAmounttWei, 'risk correct');
    assert.equal(commitment[1], false, 'goal not met by default');
  });

  it('can add many participants', async () => {
    for (i = 1; i <= 3; i++) {
      var tx = await cu.add(crucible, 'user' + i);

      var participant = await crucible.participants.call(i - 1);
      assert.equal(participant, address['user' + i], 'first participant is user' + i);

      var commitment = await crucible.commitments.call(participant);
      assert.equal(commitment[0].toNumber(), cu.riskAmounttWei, 'risk correct');
      assert.equal(commitment[1], false, 'goal not met by default');
    }
  });

  it('add participant with amount below minAmount', async () => {
    try {
      var tx = await cu.add(crucible, 'user1', cu.tooLowAmounttWei);
    } catch (err) {
      assert.equal(
        err.message,
        'VM Exception while processing transaction: revert',
        'threw error'
      );
    }
  });

});
