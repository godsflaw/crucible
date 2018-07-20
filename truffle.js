var child_process = require('child_process');
var bip39 = require('bip39');
var hdkey = require('ethereumjs-wallet/hdkey');
var ProviderEngine = require('web3-provider-engine');
var WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
var Web3Subprovider = require('web3-provider-engine/subproviders/web3.js');
var Web3 = require('web3');

const FilterSubprovider =
  require('web3-provider-engine/subproviders/filters.js');

if (process.env.CRUCIBLE_ENV === 'staging') {
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
  var providerUrl = 'https://rinkeby.infura.io/';
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
      provider: engine, // Use our custom provider
      from: address,    // Use the address we derived
      network_id: '4',  // Official rinkeby network id
    },
    production: {
      host: "localhost",
      port: 8545,
      network_id: "1"   // Main Ethereum Network
    }
  },
  rpc: {
    // Use the default host and port
    host: "localhost",
    port: 8545,
    network_id: "*"     // Match any network id
  }
};
