const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config/env');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[Database Engine] Connection failed:', err.message);
  } else {
    console.log('[Database Engine] Connected to SQLite database at', DB_PATH);
  }
});

// Promisified query execution helpers using parameterized inputs exclusively
const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

module.exports = {
  db,
  query
};
