FROM godsflaw/truffle:4.1
MAINTAINER Christopher Mooney <chris@dod.net>

ENV CRICIBLE="/crucible"

# drop codebase
RUN mkdir -p ${CRICIBLE}
ADD box-img-lg.png ${CRICIBLE}
ADD box-img-sm.png ${CRICIBLE}
ADD bs-config.json ${CRICIBLE}
ADD package-lock.json ${CRICIBLE}
ADD package.json ${CRICIBLE}
ADD truffle.js ${CRICIBLE}
ADD env-staging ${CRICIBLE}
ADD contracts ${CRICIBLE}/contracts
ADD migrations ${CRICIBLE}/migrations
ADD scripts ${CRICIBLE}/scripts
ADD src ${CRICIBLE}/src
ADD test ${CRICIBLE}/test

# install codebase
RUN (cd ${CRICIBLE} ; npm install)

EXPOSE 3000
EXPOSE 8545

# run the tests
WORKDIR "${CRICIBLE}"
CMD ["./scripts/crucible", "start"]
