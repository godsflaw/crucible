const child_process = require('child_process');
const Web3 = require('web3');
const HDWalletProvider = require("truffle-hdwallet-provider");

var web3 = new Web3();
var environment = process.env.CRUCIBLE_ENV || 'development';
var provider;

if (environment !== 'development') {
  var providerUrl;

  if (environment === 'production') {
    providerUrl = 'https://mainnet.infura.io/';
  } else if (environment === 'staging') {
    providerUrl = 'https://rinkeby.infura.io/';
  } else if (environment === 'ropsten') {
    providerUrl = 'https://ropsten.infura.io/';
  } else if (environment === 'kovan') {
    providerUrl = 'https://kovan.infura.io/';
  } else {
    providerUrl = 'https://rinkeby.infura.io/';
  }

  // unseal the vault
  child_process.execSync('./scripts/vault_unseal.js');

  // Get our mnemonic and create an hdwallet
  var mnemonic = child_process.execSync(
    './scripts/vault_get_mnemonic.js'
  ).toString().replace(/\n/, '');

  provider = new HDWalletProvider(mnemonic, providerUrl);
}

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"   // Match any network id
    },
    staging: {
      provider: provider,
      gasPrice: web3.toWei('100', 'gwei'),
      network_id: '4',  // Official rinkeby network id
    },
    production: {
      provider: provider,
      gasPrice: web3.toWei('10', 'gwei'),
      network_id: "1",  // Main Ethereum Network
    },
    ropsten: {
      provider: provider,
      gasPrice: web3.toWei('10', 'gwei'),
      network_id: '3',  // Official ropsten network id
    },
    kovan: {
      provider: provider,
      gasPrice: web3.toWei('10', 'gwei'),
      network_id: '42',  // Official kovan network id
    },
  },
  rpc: {
    // Use the default host and port
    host: "localhost",
    port: 8545,
    network_id: "*"     // Match any network id
  }
};
