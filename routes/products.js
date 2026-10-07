const express = require('express');
const router = express.Router();
const db = require('../db');
const store = require('../data/store');
const { authenticateToken, requireAdmin } = require('./auth');

// 1. Get Product Catalog
router.get('/', authenticateToken, async (req, res) => {
    try {
        let queryStr = 'SELECT * FROM products WHERE is_active = TRUE ORDER BY name ASC';
        let params = [];

        // Admins can see archived (inactive) products too
        if (req.user && req.user.role === 'admin') {
            queryStr = 'SELECT * FROM products ORDER BY name ASC';
        }

        const productsRes = await db.query(queryStr, params);
        if (productsRes.rows && productsRes.rows.length > 0) {
            return res.json(productsRes.rows);
        }
        // If DB has 0 products, return store products
        const onlyActive = !(req.user && req.user.role === 'admin');
        return res.json(store.getProducts(onlyActive));
    } catch (error) {
        // Transparent fallback to persistent store
        const onlyActive = !(req.user && req.user.role === 'admin');
        return res.json(store.getProducts(onlyActive));
    }
});

// 2. Add New Product (Admin Only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { name, description, unitPrice, stockQuantity, minOrderQuantity, category, imageUrl } = req.body;

    if (!name || unitPrice === undefined) {
        return res.status(400).json({ error: 'Product name and unit price are required' });
    }

    try {
        const productRes = await db.query(
            `INSERT INTO products (name, description, unit_price, stock_quantity, min_order_quantity, category, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                name,
                description || null,
                unitPrice,
                stockQuantity !== undefined ? stockQuantity : 0,
                minOrderQuantity !== undefined ? minOrderQuantity : 1,
                category || 'all',
                imageUrl || null
            ]
        );
        // Also sync to store
        store.saveProduct(productRes.rows[0]);
        res.status(201).json(productRes.rows[0]);
    } catch (error) {
        const saved = store.saveProduct({
            name,
            description,
            unitPrice,
            stockQuantity,
            minOrderQuantity,
            category,
            imageUrl
        });
        res.status(201).json(saved);
    }
});

// 3. Edit Product (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, unitPrice, stockQuantity, minOrderQuantity, isActive, category, imageUrl } = req.body;

    try {
        // Fetch current product values
        const checkRes = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
            // Check store
            const storeProduct = store.getProductById(id);
            if (!storeProduct) return res.status(404).json({ error: 'Product not found' });
            const updated = store.saveProduct({ id, name, description, unitPrice, stockQuantity, minOrderQuantity, isActive, category, imageUrl });
            return res.json(updated);
        }

        const current = checkRes.rows[0];

        const updated = await db.query(
            `UPDATE products
             SET name = $1, description = $2, unit_price = $3, stock_quantity = $4, min_order_quantity = $5, is_active = $6, category = $7, image_url = $8
             WHERE id = $9 RETURNING *`,
            [
                name !== undefined ? name : current.name,
                description !== undefined ? description : current.description,
                unitPrice !== undefined ? unitPrice : current.unit_price,
                stockQuantity !== undefined ? stockQuantity : current.stock_quantity,
                minOrderQuantity !== undefined ? minOrderQuantity : current.min_order_quantity,
                isActive !== undefined ? isActive : current.is_active,
                category !== undefined ? category : current.category,
                imageUrl !== undefined ? imageUrl : current.image_url,
                id
            ]
        );

        store.saveProduct(updated.rows[0]);
        res.json(updated.rows[0]);
    } catch (error) {
        const updated = store.saveProduct({ id, name, description, unitPrice, stockQuantity, minOrderQuantity, isActive, category, imageUrl });
        res.json(updated);
    }
});

// 4. Archive Product (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const checkRes = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        if (checkRes.rows.length === 0) {
            store.archiveProduct(id);
            return res.json({ message: 'Product archived successfully' });
        }

        await db.query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
        store.archiveProduct(id);
        res.json({ message: 'Product archived successfully' });
    } catch (error) {
        store.archiveProduct(id);
        res.json({ message: 'Product archived successfully' });
    }
});

module.exports = router;
