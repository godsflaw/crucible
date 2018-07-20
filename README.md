[![Codefresh build status]( https://g.codefresh.io/api/badges/build?repoOwner=godsflaw&repoName=crucible&branch=dev&pipelineName=crucible&accountName=godsflaw&key=eyJhbGciOiJIUzI1NiJ9.NTljZGM0MWUyYzU0ZTcwMDAxY2Y5NTg1.2DX4cg1dpW9ZLu5kV-goA1vC-GatcnyaQB2Tkabd6ZQ&type=cf-1)]( https://g.codefresh.io/repositories/godsflaw/crucible/builds?filter=trigger:build;branch:dev;service:59cdc506f586af000152b93e~crucible)

![Crucible](crucible.png)

# crucible
Crucible is a smart contract on the ethereum blockchain to enforce globally
unique passwords.

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

## start server locally
```
npm run develpment
```

## start server in docker container
```
docker build -t godsflaw/crucible:dev .
docker run -p 3000:3000 -p 8545:8545 godsflaw/crucible:dev
```
