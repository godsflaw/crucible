[![Codefresh build status]( https://g.codefresh.io/api/badges/build?repoOwner=godsflaw&repoName=crucible&branch=dev&pipelineName=crucible&accountName=godsflaw&key=eyJhbGciOiJIUzI1NiJ9.NTljZGM0MWUyYzU0ZTcwMDAxY2Y5NTg1.2DX4cg1dpW9ZLu5kV-goA1vC-GatcnyaQB2Tkabd6ZQ&type=cf-1)]( https://g.codefresh.io/repositories/godsflaw/crucible/builds?filter=trigger:build;branch:dev;service:59cdc506f586af000152b93e~crucible)

![Crucible](crucible.png)

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

## OSX
```
brew install ethereum
```

## everyone
```
npm install -g truffle
npm install -g ethereumjs-testrpc
git clone git@github.com:godsflaw/crucible.git
cd crucible
npm install
truffle compile
truffle migrate
```

## to run tests and bring up the testrpc blockchain
```
npm test
```

## spin up in docker container
```
docker build -t godsflaw/crucible:dev .
docker run godsflaw/crucible:dev
```

## version bump before PR is merged to dev

You need to update the version in package.json, then run the following:
```
./scripts/version_bump
```
