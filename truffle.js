const child_process = require('child_process');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');
const ProviderEngine = require('web3-provider-engine');
const WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
const Web3Subprovider = require('web3-provider-engine/subproviders/web3.js');
const Web3 = require('web3');

const FilterSubprovider =
  require('web3-provider-engine/subproviders/filters.js');

var web3 = new Web3();
var environment = process.env.CRUCIBLE_ENV || 'development';
var providerUrl;

if (environment === 'production') {
  providerUrl = 'https://mainnet.infura.io/';
} else if (environment === 'staging') {
  providerUrl = 'https://rinkeby.infura.io/';
} else {
  providerUrl = 'https://rinkeby.infura.io/';
}

if (environment !== 'development') {
  // unseal the vault
  child_process.execSync('./scripts/vault_unseal.js');

  // Get our mnemonic and create an hdwallet
  var mnemonic = child_process.execSync(
    './scripts/vault_get_mnemonic.js'
  ).toString().replace(/\n/, '');
  var hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic));

  // Get the first account using the standard hd path.
  var wallet_hdpath = "m/44'/60'/0'/0/";
  var wallet = hdwallet.derivePath(wallet_hdpath + '0').getWallet();
  var address = '0x' + wallet.getAddress().toString('hex');

  // build the provider engine
  var engine = new ProviderEngine();

  // engine filters
  engine.addProvider(new FilterSubprovider());
  engine.addProvider(new WalletSubprovider(wallet, {}));
  engine.addProvider(
    new Web3Subprovider(new Web3.providers.HttpProvider(providerUrl))
  );
  engine.start();
}

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*"   // Match any network id
    },
    staging: {
      provider: engine,
      from: address,
      gasPrice: web3.toWei('5', 'gwei'),
      network_id: '4',  // Official rinkeby network id
    },
    production: {
      provider: engine,
      from: address,
      gasPrice: web3.toWei('5', 'gwei'),
      network_id: "1",  // Main Ethereum Network
    }
  },
  rpc: {
    // Use the default host and port
    host: "localhost",
    port: 8545,
    network_id: "*"     // Match any network id
  }
};
