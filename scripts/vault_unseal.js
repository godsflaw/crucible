#!/usr/bin/env node

'use strict';

if (process.env.CRUCIBLE_ENV === 'staging') {
  var vault_options = {
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.SEED_TOKEN
  };

  (async () => {
    try {
      // get new instance of the client
      var vault = require('node-vault')(vault_options);

      for (var i = 1; i <= 3; i++) {
        await vault.unseal({
          secret_shares: 1,
          key: process.env['UNSEAL_KEY' + i],
        });
      }
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  })();
};
