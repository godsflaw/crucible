#!/usr/bin/env node

'use strict';

// init vault server
async function get_deploy_key() {
  var deploykey;
  var env = process.env.CRUCIBLE_ENV;
  var vault_options = {
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.SEED_TOKEN
  };

  if (env !== 'staging' && env !== 'production') {
    env = 'staging';
  }

  try {
    // get new instance of the client
    var vault = require('node-vault')(vault_options);
    var ret = await vault.read('secret/network/' + env + '/deploykey');
    deploykey = ret.data.key;
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  return deploykey;
};

(async () => {
  console.log(await get_deploy_key());
})();
