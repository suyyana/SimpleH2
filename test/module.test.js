const mod = require('../');

describe('the Module', () => {
  it('exports the Server Class', () => {
    expect(mod).toHaveProperty('Server');
  });
});
