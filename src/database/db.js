const { db, query } = require('./connection');
const { initSchema } = require('./schema');

module.exports = {
  db,
  query,
  initSchema
};
