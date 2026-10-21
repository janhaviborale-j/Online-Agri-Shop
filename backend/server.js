
const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

// Test backend
app.get("/api", (req, res) => {
    res.json({
        message: "Online Agri Shop Backend is Running!"
    });
});

// Product prices
const prices = {
    "Tomato": 30,
    "Lady Finger": 40,
    "Papdi Val": 60,
    "Lemon": 80,
    "Spinach": 25,
    "Cauliflower": 50,
    "Coriander": 20,
    "Capsicum": 70,
    "Carrot": 45,
    "Green Peas": 90
};

// Create an order and save it in database
app.post("/api/orders", (req, res) => {
    const { name, phone, address, items } = req.body;

    if (
        !name?.trim() ||
        !/^\d{10}$/.test(phone || "") ||
        !address?.trim() ||
        !Array.isArray(items) ||
        items.length === 0
    ) {
        return res.status(400).json({
            message: "Please enter valid details and add products."
        });
    }

    const safeItems = [];

    for (const item of items) {
        const price = prices[item.name];
        const quantity = Number(item.quantity ?? 1);

        if (
            price === undefined ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 100
        ) {
            return res.status(400).json({
                message: "Invalid product or quantity."
            });
        }

        safeItems.push({
            name: item.name,
            price,
            quantity
        });
    }

    const total = safeItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    try {
        const result = db.prepare(`
            INSERT INTO orders
            (name, phone, address, items, total, status, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            name.trim(),
            phone,
            address.trim(),
            JSON.stringify(safeItems),
            total,
            "Order Placed",
            new Date().toISOString()
        );

        res.status(201).json({
            message: "Order placed successfully!",
            orderId: result.lastInsertRowid
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not save the order."
        });
    }
});

// View all orders from database
app.get("/api/orders", (req, res) => {
    try {
        const orders = db.prepare(
            "SELECT * FROM orders ORDER BY orderId DESC"
        ).all();

        res.json(orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not fetch orders."
        });
    }
});

/* ===== ADMIN PRODUCT APIs ===== */

// View all products
app.get("/api/products", (req, res) => {
    const products = db.prepare(
        "SELECT * FROM products ORDER BY id DESC"
    ).all();

    res.json(products);
});

// Add a new product
app.post("/api/products", (req, res) => {
    const { name, price, unit, description = "" } = req.body;

    if (
        typeof name !== "string" ||
        !name.trim() ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0 ||
        typeof unit !== "string" ||
        !unit.trim() ||
        typeof description !== "string"
    ) {
        return res.status(400).json({
            message: "Please enter valid product details."
        });
    }

    try {
        const result = db.prepare(`
            INSERT INTO products (name, price, unit, description)
            VALUES (?, ?, ?, ?)
        `).run(
            name.trim(),
            Number(price),
            unit.trim(),
            description.trim()
        );

        res.status(201).json({
            message: "Product added successfully!",
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not add product."
        });
    }
});

// Edit an existing product
app.put("/api/products/:id", (req, res) => {
    const { name, price, unit, description = "" } = req.body;

    if (
        !/^\d+$/.test(req.params.id) ||
        typeof name !== "string" ||
        !name.trim() ||
        !Number.isFinite(Number(price)) ||
        Number(price) <= 0 ||
        typeof unit !== "string" ||
        !unit.trim() ||
        typeof description !== "string"
    ) {
        return res.status(400).json({
            message: "Please enter valid product details."
        });
    }

    const result = db.prepare(`
        UPDATE products
        SET name = ?, price = ?, unit = ?, description = ?
        WHERE id = ?
    `).run(
        name.trim(),
        Number(price),
        unit.trim(),
        description.trim(),
        Number(req.params.id)
    );

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Product not found."
        });
    }

    res.json({ message: "Product updated successfully!" });
});

// Delete a product
app.delete("/api/products/:id", (req, res) => {
    if (!/^\d+$/.test(req.params.id)) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    const result = db.prepare(
        "DELETE FROM products WHERE id = ?"
    ).run(Number(req.params.id));

    if (result.changes === 0) {
        return res.status(404).json({
            message: "Product not found."
        });
    }

    res.json({ message: "Product deleted successfully!" });
});

// View one order by Order ID
app.get("/api/orders/:id", (req, res) => {
    try {
        const order = db.prepare(
            "SELECT * FROM orders WHERE orderId = ?"
        ).get(req.params.id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found. Please check your Order ID."
            });
        }

        res.json({
            ...order,
            items: JSON.parse(order.items)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not fetch order."
        });
    }
});

// Temporary registration and login
// These users are not yet stored in the database.
const users = [];

app.post("/api/register", (req, res) => {
    const { name, email, password, userType } = req.body;

    if (
        !name?.trim() ||
        !email?.trim() ||
        !password ||
        !userType
    ) {
        return res.status(400).json({
            message: "Please fill all fields."
        });
    }

    const existingUser = users.find(
        user => user.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            message: "Email already registered."
        });
    }

    users.push({
        name: name.trim(),
        email: email.trim(),
        password,
        userType
    });

    res.status(201).json({
        message: "Registration successful!"
    });
});

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    const user = users.find(
        u =>
            u.email.toLowerCase() === (email || "").trim().toLowerCase() &&
            u.password === password
    );

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password."
        });
    }

    res.json({
        message: "Login successful!",
        name: user.name,
        userType: user.userType
    });
});

/* ===== ADMIN DASHBOARD APIs ===== */

// Dashboard summary
app.get("/api/admin/summary", (req, res) => {
    try {
        const totalProducts = db.prepare(
            "SELECT COUNT(*) AS count FROM products"
        ).get().count;

        const totalOrders = db.prepare(
            "SELECT COUNT(*) AS count FROM orders"
        ).get().count;

        const totalSales = db.prepare(
            "SELECT COALESCE(SUM(total), 0) AS amount FROM orders"
        ).get().amount;

        // Users table may not be connected to registration yet.
        let totalUsers = 0;

        try {
            totalUsers = db.prepare(
                "SELECT COUNT(*) AS count FROM users"
            ).get().count;
        } catch (error) {
            totalUsers = 0;
        }

        res.json({
            totalProducts,
            totalOrders,
            totalUsers,
            totalSales
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load dashboard summary."
        });
    }
});

// Recent orders for Admin Dashboard
app.get("/api/admin/orders", (req, res) => {
    try {
        const orders = db.prepare(`
            SELECT orderId, name, phone, address,
                   total, status, date, items
            FROM orders
            ORDER BY orderId DESC
        `).all();

        res.json(orders.map(order => ({
            ...order,
            items: JSON.parse(order.items)
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Could not load orders."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
