FROM godsflaw/truffle:4.1.14
MAINTAINER Christopher Mooney <chris@dod.net>

ENV CRICIBLE="/crucible"

# drop codebase
RUN mkdir -p ${CRICIBLE}

ADD .git ${CRICIBLE}/.git
ADD .github ${CRICIBLE}/.github
ADD contracts ${CRICIBLE}/contracts
ADD migrations ${CRICIBLE}/migrations
ADD scripts ${CRICIBLE}/scripts
ADD test ${CRICIBLE}/test

ADD .gitignore ${CRICIBLE}
ADD package-lock.json ${CRICIBLE}
ADD package.json ${CRICIBLE}
ADD truffle.js ${CRICIBLE}
ADD index.js ${CRICIBLE}
ADD zos.json ${CRICIBLE}
ADD zos.staging.json ${CRICIBLE}
ADD zos.production.json ${CRICIBLE}
ADD zos.ropsten.json ${CRICIBLE}
ADD zos.kovan.json ${CRICIBLE}
ADD docker ${CRICIBLE}

# install codebase
RUN (cd ${CRICIBLE} && echo 'true' > ./docker && npm install)

# any ports we want to expose
EXPOSE 8545

# run the tests
WORKDIR "${CRICIBLE}"
CMD ["./scripts/crucible", "start"]
