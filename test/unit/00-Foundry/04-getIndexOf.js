const Foundry = artifacts.require("./Foundry.sol");

contract('Foundry - getIndexOf', async (accounts) => {
  beforeEach(async () => {
  });

  afterEach(async () => {
  });

  it('all tests for getIndexOf are touched on in deleteCrucible', async () => {
    // we don't have any tests for getIndexOf() because they are basically
    // all hit in deleteCrucible().  I would have combined these two functions
    // but the gas costs of getIndexOf() grows with the array size, so it was
    // best to split them.
    assert.ok(true, 'runs good');
  });

});
