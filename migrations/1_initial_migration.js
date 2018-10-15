var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  var env = process.env.CRUCIBLE_ENV;

  // for staging and production, the migration is handled by zos.
  if (env === 'development') {
    deployer.deploy(Migrations);
  }
};
