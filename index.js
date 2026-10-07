const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const store = require('./data/store');
const { router: authRouter, authenticateToken, requireAdmin } = require('./routes/auth');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');

// Database Migrations (Auto-extend Products table schema)
async function runMigrations() {
    try {
        await db.query(`
            ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'all';
            ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);
        console.log('✅ [MIGRATION] Products table schema verified (category & image_url active)');
    } catch (err) {
        console.warn('⚠️ [MIGRATION WARNING] Database connection refused or schema migration skipped:', err.message);
    }
}
runMigrations();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and parsing middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Dedicated Shops API Routes
app.get('/api/shops', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const shopsRes = await db.query('SELECT s.*, u.phone, u.email FROM shops s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.shop_name ASC');
        if (shopsRes.rows && shopsRes.rows.length > 0) return res.json(shopsRes.rows);
        return res.json(store.getShops());
    } catch (err) {
        return res.json(store.getShops());
    }
});

app.post('/api/shops/:id/payment', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { amount, method, notes } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive payment amount required' });
    }
    try {
        await db.query('UPDATE shops SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [amount, id]);
        await db.query('INSERT INTO payments (shop_id, amount, payment_method, status, notes) VALUES ($1, $2, $3, $4, $5)', [id, amount, method || 'cash', 'completed', notes || 'Manual payment']);
        const result = store.recordShopPayment(id, amount, method, notes);
        return res.json({ message: `Payment of ₹${parseFloat(amount).toFixed(2)} recorded successfully`, shop: result ? result.shop : null });
    } catch (err) {
        const result = store.recordShopPayment(id, amount, method, notes);
        if (!result) return res.status(404).json({ error: 'Shop not found' });
        return res.json({ message: `Payment of ₹${parseFloat(amount).toFixed(2)} recorded successfully (Store)`, shop: result.shop });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT NOW()');
        res.json({ status: 'ok', db: 'connected', store: 'active', time: new Date() });
    } catch (err) {
        res.json({ status: 'ok', db: 'offline (store active)', store: 'active', time: new Date() });
    }
});

// Redirect root URL to login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Bharath Paper Agency server running on port ${PORT}`);
    console.log(`=================================================`);
});
