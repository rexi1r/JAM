const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';

require('./server');

const Contract = mongoose.models.Contract;

test('Contract requires contractOwner field', async () => {
  const c = new Contract({ eventDate: '1403/01/01' });
  let error;
  try {
    await c.validate();
  } catch (e) {
    error = e;
  }
  assert.ok(error?.errors?.contractOwner);
});
