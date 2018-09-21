const should = require('chai')
  .should();

async function expectThrow (promise, message) {
  try {
    await promise;
  } catch (error) {
    if (message) {
      error.message.should.include(
        message, 'Expected \'' + message + '\', got \'' + error + '\' instead'
      );
      return;
    } else {
      error.message.should.match(
        /[invalid opcode|out of gas|revert|is not a contract address]/,
        'Expected throw, got \'' + error + '\' instead'
      );
      return;
    }
  }
  should.fail('Expected throw not received');
}

module.exports = {
  expectThrow,
};
