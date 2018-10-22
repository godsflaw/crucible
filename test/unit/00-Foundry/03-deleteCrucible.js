const CrucibleUtils = require('../../fixtures/crucible_utils');
const Address = require('../../fixtures/address');
const { expectThrow } = require('../../fixtures/expectThrow');
const { EVMRevert } = require('../../fixtures/EVMRevert');
const { EVMThrow } = require('../../fixtures/EVMThrow');
const truffleAssert = require('truffle-assertions');

const Foundry = artifacts.require("./Foundry.sol");
const Crucible = artifacts.require("./Crucible.sol");

contract('Foundry - deleteCrucible', async (accounts) => {
  let cu;
  let address;
  let foundry;

  beforeEach(async () => {
    cu = new CrucibleUtils();
    address = new Address();

    foundry = await Foundry.new({ from: address.owner });
  });

  afterEach(async () => {
  });

  it('can delete a crucible', async () => {
    var crucible1;

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible1 = Crucible.at(ev.contractAddress);
    });

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 1, 'got correct count');

    // delete crucible1
    index = await foundry.getIndexOf(crucible1.address);
    tx = await foundry.deleteCrucible(crucible1.address, index.toNumber());
    truffleAssert.eventEmitted(tx, 'CrucibleDeleted', (ev) => {
      return (ev.contractAddress == crucible1.address);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');
    await expectThrow(foundry.getIndexOf(crucible1.address), EVMRevert);
  });

  it('can delete all crucibles in the list', async () => {
    var crucible1;
    var crucible2;
    var crucible3;

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible1 = Crucible.at(ev.contractAddress);
    });

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible2 = Crucible.at(ev.contractAddress);
    });

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible3 = Crucible.at(ev.contractAddress);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');

    // delete crucible2
    var index = await foundry.getIndexOf(crucible2.address);
    tx = await foundry.deleteCrucible(crucible2.address, index.toNumber());
    truffleAssert.eventEmitted(tx, 'CrucibleDeleted', (ev) => {
      return (ev.contractAddress == crucible2.address);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');
    await expectThrow(foundry.getIndexOf(crucible2.address), EVMRevert);

    // delete crucible1
    index = await foundry.getIndexOf(crucible1.address);
    tx = await foundry.deleteCrucible(crucible1.address, index.toNumber());
    truffleAssert.eventEmitted(tx, 'CrucibleDeleted', (ev) => {
      return (ev.contractAddress == crucible1.address);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 1, 'got correct count');
    await expectThrow(foundry.getIndexOf(crucible1.address), EVMRevert);

    // delete crucible3
    index = await foundry.getIndexOf(crucible3.address);
    tx = await foundry.deleteCrucible(crucible3.address, index.toNumber());
    truffleAssert.eventEmitted(tx, 'CrucibleDeleted', (ev) => {
      return (ev.contractAddress == crucible3.address);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');
    await expectThrow(foundry.getIndexOf(crucible3.address), EVMRevert);
  });

  it('throws if there are no crucibles', async () => {
    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

    await expectThrow(foundry.getIndexOf(address.owner), EVMRevert);
    await expectThrow(foundry.deleteCrucible(address.owner, 0), EVMRevert);
  });

  it('throws if we are past last index', async () => {
    var crucible1;
    var crucible2;
    var crucible3;

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible1 = Crucible.at(ev.contractAddress);
    });

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible2 = Crucible.at(ev.contractAddress);
    });

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible3 = Crucible.at(ev.contractAddress);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');

    // delete crucible3
    index = await foundry.getIndexOf(crucible3.address);
    tx = await foundry.deleteCrucible(crucible3.address, index.toNumber());
    truffleAssert.eventEmitted(tx, 'CrucibleDeleted', (ev) => {
      return (ev.contractAddress == crucible3.address);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');
    await expectThrow(foundry.getIndexOf(crucible3.address), EVMRevert);

    // delete past index
    await expectThrow(foundry.deleteCrucible(crucible3.address, 2), EVMThrow);
  });

  it('throws if index and address mismatch', async () => {
    var crucible1;
    var crucible2;
    var crucible3;

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible1 = Crucible.at(ev.contractAddress);
    });

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible2 = Crucible.at(ev.contractAddress);
    });

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible3 = Crucible.at(ev.contractAddress);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');

    // mismatch index and crucible delete crucible3
    index = await foundry.getIndexOf(crucible3.address);
    await expectThrow(
      foundry.deleteCrucible(crucible2.address, index.toNumber()), EVMRevert
    );

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');
  });

  it('throws if we are not the owner', async () => {
    var crucible1;
    var crucible2;
    var crucible3;

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 0, 'got correct count');

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

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible1 = Crucible.at(ev.contractAddress);
    });

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible2 = Crucible.at(ev.contractAddress);
    });

    var count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 2, 'got correct count');

    tx = await foundry.newCrucible(
      address.oracle,
      address.empty,
      cu.startDate(),
      cu.lockDate(),
      cu.endDate(),
      cu.minAmountWei,
      cu.timeout,
      cu.feeNumerator,
    );

    truffleAssert.eventEmitted(tx, 'CrucibleCreated', (ev) => {
      crucible3 = Crucible.at(ev.contractAddress);
    });

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');

    // mismatch index and crucible delete crucible3
    index = await foundry.getIndexOf(crucible3.address);
    await expectThrow(foundry.deleteCrucible(
      crucible3.address, index.toNumber(), { 'from': address.oracle }
    ), EVMRevert);

    count = await foundry.getCount.call();
    assert.equal(count.toNumber(), 3, 'got correct count');
  });
});
