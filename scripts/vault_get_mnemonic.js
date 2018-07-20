#!/usr/bin/env node

'use strict';

// init vault server
async function get_mnemonic() {
  var mnemonic;
  var vault_options = {
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.SEED_TOKEN
  };

  try {
    // get new instance of the client
    var vault = require('node-vault')(vault_options);
    var ret = await vault.read('secret/network/staging/seed');
    mnemonic = ret.data.key;
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  return mnemonic;
};

(async () => {
  console.log(await get_mnemonic());
})();
