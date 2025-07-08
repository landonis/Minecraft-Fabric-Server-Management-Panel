// src/db.ts
import Database from 'better-sqlite3';

const db = new Database('./data/database.sqlite');

export default db;
