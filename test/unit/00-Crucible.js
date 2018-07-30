var Crucible = artifacts.require("./Crucible.sol");

contract('Crucible', function(accounts) {

  it('should verify the owner', async function() {
    var token = await Crucible.deployed();
    var owner = await token.owner.call();
    assert.equal(
      owner, '0x5dee77e75a0f9e5272a02d67ce0bf9f3608355fe', 'got owner'
    );
  });

  it('check values after construction', async function() {
    var crucible = await Crucible.deployed();
    var name = await crucible.name.call();
    assert.equal(name, 'test', 'name = test expected');
  });

});
