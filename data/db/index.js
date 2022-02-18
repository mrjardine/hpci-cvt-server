const { Pool } = require('pg');
const { env } = require('../../config');
const { now } = require('../../utils/day');

const pool = env !== 'DEV' ? new Pool() : null;

// single query
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (env === 'PGDEV') {
      const duration = Date.now() - start;
      console.log('Executed query:', {
        text,
        params,
        duration,
        rows: result.rowCount
      });
      console.trace();
    }
    return result;
  } catch (error) {
    console.error('ERROR [' + now() + '] - Error executing query:', {
      text,
      params,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  query
};
