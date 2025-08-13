const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';

require('./server');

const StudioContract = mongoose.models.StudioContract;

test('StudioContract requires fullName field', async () => {
  const c = new StudioContract({});
  let error;
  try {
    await c.validate();
  } catch (e) {
    error = e;
  }
  assert.ok(error?.errors?.fullName);
});
