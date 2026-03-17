const { getDb, saveDb } = require('./database');

function prepare(sql) {
  return {
    get(...params) {
      const db = getDb();
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all(...params) {
      const db = getDb();
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) results.push(stmt.getAsObject());
      stmt.free();
      return results;
    },
    run(...params) {
      const db = getDb();
      db.run(sql, params);
      const lastId = db.exec('SELECT last_insert_rowid() as id')[0];
      saveDb();
      return { lastInsertRowid: lastId ? lastId.values[0][0] : null };
    }
  };
}

module.exports = { prepare };
