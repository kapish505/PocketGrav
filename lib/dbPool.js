/**
 * Database Connection Pool
 * 
 * Replaces single-connection Supabase client with a pooled
 * connection manager for better performance under load.
 * 
 * WARNING: This is a breaking change — all existing database
 * calls need to be updated to use getClient() / releaseClient().
 */

const { createClient } = require('@supabase/supabase-js');

const POOL_SIZE = 10;
const pool = [];
const waiting = [];

function initPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      client: createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      ),
      inUse: false,
      id: i,
    });
  }
  console.log(`[DB Pool] Initialized ${POOL_SIZE} connections`);
}

async function getClient() {
  const available = pool.find(c => !c.inUse);
  if (available) {
    available.inUse = true;
    return available;
  }

  // All connections busy — wait for one to free up
  return new Promise((resolve) => {
    waiting.push(resolve);
  });
}

function releaseClient(conn) {
  conn.inUse = false;
  if (waiting.length > 0) {
    const next = waiting.shift();
    conn.inUse = true;
    next(conn);
  }
}

function getPoolStats() {
  return {
    total: POOL_SIZE,
    active: pool.filter(c => c.inUse).length,
    idle: pool.filter(c => !c.inUse).length,
    waiting: waiting.length,
  };
}

module.exports = { initPool, getClient, releaseClient, getPoolStats };
