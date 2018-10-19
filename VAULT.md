# Vault Setup
This is the guide one should follow to setup a container with vault that can
hold the mnemonic seed for the wallet that the contracts are deployed with.

## fork the vault repo (terminal #1)

```
git clone git@github.com:godsflaw/vault.git crucible-vault
cd crucible-vault
grep mlock config.hcl
```

Note that the `config.hcl` file in this repo has a line for
`disable_mlock = true`.  This is because mlock requires that the container be
run in privileged mode.  Some container hosting providers don't allow this.
If your provider allows this, then you should remove this line as it make the
vault more secure by preventing memory from getting swapped to disk.  Otherwise
know that your vault is less secure, but that you won't get errors on providers
that don't allow privileged mode.

## build the container (terminal #1)

```
docker build -t godsflaw/vault:sealed .
```

## start the container up (terminal #1)

```
docker run -p 8200:8200 godsflaw/vault:sealed
```

## generate a new mnemonic (terminal #2)

From yet another terminal, change directory into the crucible repo.  We need
to generate a mnemonic.  All you need to do is run the following script
and keep the resulting words in a safe palce.  You can also use one you alreay
have, but if this is for a staging environment, I would not use the same
mnemonic you've used for any other sensitive project.

```
cd $CRUCIBLE_HOME
./scripts/create_mnemonic.js
```

This should generate something like: `cupboard swallow cruel repeat female
biology blood wrist people theory bicycle egg`.  This is an example, and you
should not use this mnemonic.  Save the newly generated mnemonic somewhere safe
or import it into your MetaMask wallet (or both).  To import into MetaMask, you
will need the `bx` tool and the private key derived from the mnemonic.  You can
get the private key used for import by running:

```
echo "<MNEMONIC WORDS>" | \
  bx mnemonic-to-seed | \
  bx hd-new -v 76066276 | \
  bx hd-private -d -i 44 | \
  bx hd-private -d -i 60 | \
  bx hd-private -d -i 0 | \
  bx hd-private -i 0 | \
  bx hd-private -i 0 | \
  bx hd-to-ec
```

Again, keep private key result of this secret.  For the example mnemonic above
this command would produce a private key of the format:
`ad25c782f541b8866478ad1df4eb6bcf57c1ee9bb9a895aaa2acef169ad22f7c`

## start a shell in the container (terminal #3)

From yet another terminal, you need to start a shell in the vault container.

```
docker ps
docker exec -it <CONTAINER ID> /bin/sh
```

## once in the shell you must initialize vault (terminal #3)

```
export VAULT_ADDR=http://localhost:8200
vault init
```

Copy all 5 keys and the root key off to a safe place.  Three of these keys are
needed to unseal a sealed vault.  It's best, in a production environment, that
these keys are never held all in the same place.  For staging, it is relatively
harmless to put these three keys in a configuration file; however, DO NOT use
the same mnemonic that you use for production or any other sensitive project.

## edit `./env-staging` and run it (terminal #2)

back to `terminal #2` add three of the vault keys (as UNSEAL_KEY1, UNSEAL_KEY2,
UNSEAL_KEY3) and the root token (as SEED_TOKEN) from `vault init` to the
`./env-staging` script.  Run that and unseal the vault.

```
./scripts/plumb-env
vi env-staging
. ./env-staging
export VAULT_ADDR=http://localhost:8200
./scripts/vault_unseal.js
```

## once in the shell you must initialize vault and seal it (terminal #3)

Use the mnemonic words we generated and saved earlier to be stored in the vault.
You also need to make a file named `key` and put the ssh deploy key for the
crucible repo in it.
You must run `vault auth` and provide the root token.

```
vi ./key
vault auth
vault write secret/network/staging/seed key="<MNEMONIC WORDS>"
cat ./key | vault write secret/network/staging/deploykey key=-
rm ./key
vault seal
```
The last command sealed the vault.  Next we will attempt to unseal it again.

## test that you can unseal and get the nmemonic (terminal #2)

Now that your environment has all the variables needed to think it is staging,
and unseal the vault.  At this point, you can run the unseal script
(`./scripts/vault_unseal.js`) and the script to extract the nmemonic
(`./scripts/vault_get_mnemonic.js`) to make sure our vault container works as
expected.

```
./scripts/vault_unseal.js
./scripts/vault_get_mnemonic.js
./scripts/vault_get_deploy_key.js
```

In `terminal #1` you should see log messages.

## re-seal and clean up your shell history in the container (terminal #3)

Since your shell history in the container contains the mnemonic, we want to
clean it up with the following commands:

```
vault seal
cat /dev/null > ~/.bash_history
cat /dev/null > ~/.ash_history
exit
```

If you start a shell in the container again, you can confirm that `exit` is the
only command in your history.  You should now have a sealed vault container.

## commit and push that container (terminal #3)

Now that we have a sealed vault container with a nmemonic and a clean shell
history.  We can snapshot this state and push the container to a hosted
location.

```
docker ps
docker commit <CONTAINER ID> r.cfcr.io/godsflaw/vault:crucible-staging-sealed
docker push r.cfcr.io/godsflaw/vault:crucible-staging-sealed
```

## As a bonus, you can now run integration tests from (terminal #2)

To develop integration tests, you need only run `npm run deploy && npm test` from your terminal
that has all the settings as though it is the staging environment.

```
npm test
```

NOTE: After you run tests, it will unseal the vault.  You will need to re-seal
it or restart from the earlier commit.  When you are finished you can exit out
of `terminal #1`, and `terminal #2`.

## Understanding `codefresh.yml` and how the vault is pulled in (terminal #3)

Under the `RunningIntegrationTests` section, you will notice this sub-section:

```
    composition:
      version: '2'
      services:
        vault:
          image: r.cfcr.io/godsflaw/vault:crucible-staging-sealed
```

This defines the vault service.  When privileged mode was allowed on CodeFresh
there was an additional line below image that read `privileged: true`.  This
service can now be referenced as a dependancy in the `composition_candidates`
section.  Where we also set the staging environment.  The environment variables
in ./env-staging are also set in the crucible repository config on codefresh
for all but `CRUCIBLE_ENV`.

```
    composition_candidates:
      test_service:
        depends_on:
          - vault
        image: '${{BuildingDockerImage}}'
        env_file: ./env-staging
        command: sh -c 'npm run deploy && npm test'
```

# Troubleshooting

* Every now and then, integration tests will fail with something like
`nonce too low`.  This is becasue the address we use for the staging network
is likely a pool of servers that are not all up-to-date on the last transaction.
Click the `restart` button in the codefresh build interface and this should
retry the build, perhaps repairing the problem.  Luckily, this only needs to
happen when we push to the dev branch.

* To send your new wallet ETH on Rinkeby, you need to get the public key from
MetaMask and follow the instructions at: https://www.rinkeby.io/#faucet
