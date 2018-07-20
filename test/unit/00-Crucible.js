var Crucible = artifacts.require("./Crucible.sol");

contract('Crucible', function(accounts) {

  it('should verify the owner', async function() {
    var token = await Crucible.deployed();
    var owner = await token.owner.call();
    assert.equal(
      owner, '0x5dee77e75a0f9e5272a02d67ce0bf9f3608355fe', 'got owner'
    );
  });

  it('check balance', async function() {
    var token = await Crucible.deployed();
    var decimals = await token.decimals.call();
    var precision = decimals.toNumber();
    assert.equal(precision, 2, 'decimals precision is as expected');

    var result = await token.balanceOf(accounts[0]);
    var balance = result.c[0].toString();
    assert.equal(balance, '10000000', 'owner has balance');

    var prettyBalance = balance.substr(0, balance.length - precision) + '.' +
      balance.substr(balance.length - precision);
    assert.equal(prettyBalance, '100000.00', 'balance with precision');
  });

});
