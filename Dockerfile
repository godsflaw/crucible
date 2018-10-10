FROM godsflaw/truffle:4.1.14
MAINTAINER Christopher Mooney <chris@dod.net>

ENV CRICIBLE="/crucible"

# drop codebase
RUN mkdir -p ${CRICIBLE}

ADD contracts ${CRICIBLE}/contracts
ADD crucible.eps ${CRICIBLE}
ADD crucible.png ${CRICIBLE}
ADD env-production ${CRICIBLE}
ADD env-staging ${CRICIBLE}
ADD migrations ${CRICIBLE}/migrations
ADD package-lock.json ${CRICIBLE}
ADD package.json ${CRICIBLE}
ADD scripts ${CRICIBLE}/scripts
ADD test ${CRICIBLE}/test
ADD truffle.js ${CRICIBLE}
ADD zos.json ${CRICIBLE}

# install codebase
RUN (cd ${CRICIBLE} ; npm install)

# any ports we want to expose
EXPOSE 8545

# run the tests
WORKDIR "${CRICIBLE}"
CMD ["./scripts/crucible", "start"]
