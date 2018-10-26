[![Codefresh build status]( https://g.codefresh.io/api/badges/build?repoOwner=godsflaw&repoName=crucible&branch=dev&pipelineName=crucible&accountName=godsflaw&key=eyJhbGciOiJIUzI1NiJ9.NTljZGM0MWUyYzU0ZTcwMDAxY2Y5NTg1.2DX4cg1dpW9ZLu5kV-goA1vC-GatcnyaQB2Tkabd6ZQ&type=cf-1)]( https://g.codefresh.io/repositories/godsflaw/crucible/builds?filter=trigger:build;branch:dev;service:59cdc506f586af000152b93e~crucible)
![Crucible](crucible.png =64x64)

# crucible
A crucible is a decentralized commitment contract designed to encourage
self-improvement through the use of economic and phycological incentives like
loss aversion, accountability, and peer pressure.

This project is the core of the Crucible smart contract that lives on the
ethereum blockchain.  Included in this repo is:
* the Foundry contract for initiating and registering instances of new Crucibles
* the Crucible contract code
* extensive tests for all the above

# Getting Started (development)

This contract is very low level.  This repo contains everything one needs to
make changes, test, and deploy those underlying contracts.  You can see how to
interact with it from the tests, however, this is not ideal.  To interact with
this contract directly, we recommend using one of the following client
libraries:
* [crucible.js](https://github.com/godsflaw/crucible.js)

## development environment
```
npm install -g truffle@4.1.14
npm install -g ganache-cli
npm install -g zos
git clone git@github.com:godsflaw/crucible.git
cd crucible
npm install
```

## to compile, deploy, and test contracts
```
npm run deploy && npm test
```

## spin up in docker container
```
docker build -t godsflaw/crucible:<BRANCH> .
docker run -p 8545:8545 godsflaw/crucible:<BRANCH>
```

## version bump before PR is merged to dev
You need to update the version in package.json, then run the following:
```
./scripts/version_bump
```

Make sure you verify the diff, commit, and push all changes to your PR.

## hopping between environments easily

If you have the vault containers built with the instructions from `VAULT.md`
then you can deploy and test code on any testnet/staging/production right
from your development environment.  The staging and production vault containers
are only available to those with privledged access to the wallet keys.

`npm run deploy` will automatically spin them up.

Once you have the production and development vault containers, you can simply
run `npm run deploy` and `npm test` with the correct environment.

NOTE: only works in (`bash`):
```
# staging
./scripts/plumb-env
. ./env-staging
export VAULT_ADDR=http://localhost:8200
npm run deploy && npm test

# kovan
./scripts/plumb-env
. ./env-kovan
export VAULT_ADDR=http://localhost:8200
npm run deploy && npm test

# ropsten
./scripts/plumb-env
. ./env-ropsten
export VAULT_ADDR=http://localhost:8200
npm run deploy && npm test

# production (you might need to kill the staging vault)
./scripts/plumb-env
. ./env-production
export VAULT_ADDR=http://localhost:8200
npm run deploy && npm test

```

Flipping back to the `development` environment is easy with:
```
./scripts/plumb-env
. ./env-development
```

## deploying

Deploys are handled through github triggers.

### development

First, all changes must start with github issues in the form `CRUCIBLE-N` where
`N` is a unique monotomically increasing id. Code changes come in on github PRs
with branches named `CRUCIBLE-N` where `CRUCIBLE-N` is the corresponding issue.
When a PR is made, and for every commit pushed against that PR, a continuous
integration run is fired off on codefresh.  This run builds a docker container
and runs the unit tests against that PR's code.

When the PR has been reviewed, all items of review have been addressed, the
PR passes CI tests, and a code owner has approved it for merge, it can then be
squashed and merged right from the github interface.

NOTE: Please use squash+merge so that the entire change commits as one chunk.
This makes rollbacks considerably easier.

### staging

Deploying these contracts to staging (rinkeby) or other tests networks happens
when that PR is merged.  Any commit that lands on the `dev` branch is
automatically built, deployed, tested, and run in staging.  Sometimes this step
can cause a migration to be recommitted, if this happens, you must wait for the
next `dev` test run to complete.

NOTE: Many PRs can be on `dev` at once, for this reason, the unit tests run
again to make sure all that code works.  In addition to unit tests, a set of
integration tests runs in staging to make sure the contracts perform correctly
in the wild.

### production

Once staging looks good by passing all tests with everyone's code working
together, then the entire thing can be deployed to production with the following
git command:
```
git push origin dev:master
```

Again, this will build, deploy, test, and run the contract code.  Please be
very carful to follow all the earlier steps looking for errors.  Any mistakes
here can have extreme consiqunces including loss of funds from the contract
owners to users.

NOTE: Since the nature of a crucible is to spawn off a new contract to handle
that event, there is some protection against mistakes here.  Existing crucibles
should not be impacted by broken code.  Nevertheless, we must take care not to
break the Foundry, or new Crucibles created after code is launched.  Also, be
careful not to introduce any changes that could lead to all the funds in our
main hot wallet being depleated.
