var request = require('request-promise');

describe('connect tests', function () {
  it('can connect to webserver', async function() {
    var body = await request.get('http://localhost:3000/');
    assert.match(body, /html/, 'got HTML body');
  });
});
