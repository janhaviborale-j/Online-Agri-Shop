
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(
    path.join(__dirname, "agri_shop.db")
);

// Create Users table
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        userType TEXT NOT NULL
    )
`);

// Create Orders table
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        orderId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'Order Placed',
        date TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price > 0),
        unit TEXT NOT NULL,
        description TEXT DEFAULT ''
    )
`);


console.log("Database and tables are ready!");

module.exports = db;
