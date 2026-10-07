const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const store = require('../data/store');
const { authenticateToken, requireAdmin } = require('./auth');
const googleSheets = require('../services/googleSheets');

// Helper to simulate WhatsApp Notification (Log or Call API)
const triggerWhatsAppNotification = (phone, message) => {
    console.log(`[WHATSAPP NOTIFICATION to ${phone}]: ${message}`);
};

// 1. Create Order (By Authenticated Client)
router.post('/', authenticateToken, async (req, res) => {
    const { items, advanceAmount: customAdvance } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const shopRes = await client.query('SELECT id, shop_name, outstanding_balance, credit_limit FROM shops WHERE user_id = $1', [req.user.id]);
            if (shopRes.rows.length === 0) {
                client.release();
                throw new Error('Shop profile not found for this user');
            }
            const shop = shopRes.rows[0];

            let totalAmount = 0;
            const processedItems = [];

            for (const item of items) {
                const prodRes = await client.query('SELECT id, name, unit_price, stock_quantity, min_order_quantity FROM products WHERE id = $1 AND is_active = TRUE', [item.productId]);
                if (prodRes.rows.length === 0) {
                    throw new Error(`Product not found or inactive`);
                }
                const product = prodRes.rows[0];

                if (item.quantity < product.min_order_quantity) {
                    throw new Error(`Minimum order quantity for ${product.name} is ${product.min_order_quantity}`);
                }

                const itemTotal = Number(product.unit_price) * item.quantity;
                totalAmount += itemTotal;

                processedItems.push({
                    productId: product.id,
                    name: product.name,
                    quantity: item.quantity,
                    unitPrice: product.unit_price
                });
            }

            const advanceAmount = customAdvance !== undefined ? customAdvance : (totalAmount * 0.30);
            const quickApproveToken = crypto.randomBytes(32).toString('hex');

            const orderRes = await client.query(
                `INSERT INTO orders (shop_id, status, total_amount, advance_amount, payment_status, quick_approve_token)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [shop.id, 'placed', totalAmount, advanceAmount, 'unpaid', quickApproveToken]
            );
            const order = orderRes.rows[0];

            for (const item of processedItems) {
                await client.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                     VALUES ($1, $2, $3, $4)`,
                    [order.id, item.productId, item.quantity, item.unitPrice]
                );
            }

            await client.query('COMMIT');
            client.release();

            // Sync to store
            store.createOrder({
                shopId: shop.id,
                items,
                advanceAmount
            });

            const vpa = "bharathagency@ybl";
            const name = "Bharath Agency";
            const note = encodeURIComponent(`Advance payment for Order ${order.id.substring(0,8)}`);
            const upiLink = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${advanceAmount.toFixed(2)}&cu=INR&tn=${note}`;

            googleSheets.syncOrderToSheets(order.id).catch(err => console.error('Google Sheets Sync Error:', err));

            return res.status(201).json({
                message: 'Order placed. Complete advance payment to trigger admin approval.',
                orderId: order.id,
                totalAmount,
                advanceAmount,
                upiLink
            });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            throw dbErr;
        }
    } catch (error) {
        // Fallback to Store
        const shopId = req.user.shopId || (store.getShops()[0] ? store.getShops()[0].id : "shop-ambika-1");
        const order = store.createOrder({
            shopId: shopId,
            items,
            advanceAmount: customAdvance
        });

        const vpa = "bharathagency@ybl";
        const name = "Bharath Agency";
        const note = encodeURIComponent(`Advance payment for Order ${order.id.substring(0,8)}`);
        const upiLink = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${order.advance_amount.toFixed(2)}&cu=INR&tn=${note}`;

        return res.status(201).json({
            message: 'Order placed successfully. Complete advance payment to trigger admin approval.',
            orderId: order.id,
            totalAmount: order.total_amount,
            advanceAmount: order.advance_amount,
            upiLink
        });
    }
});

// 2. Quick Admin Approval via WhatsApp Link
router.get('/quick-approve', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('<h1>Error: Approval token is missing.</h1>');
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const orderRes = await client.query(
                `SELECT o.id, o.status, o.total_amount, o.advance_amount, s.id as shop_id, s.shop_name, u.phone as client_phone 
                 FROM orders o
                 JOIN shops s ON s.id = o.shop_id
                 JOIN users u ON u.id = s.user_id
                 WHERE o.quick_approve_token = $1`, [token]);
            
            if (orderRes.rows.length === 0) {
                client.release();
                throw new Error('Order not found');
            }
            const order = orderRes.rows[0];

            if (order.status !== 'placed') {
                client.release();
                return res.send(`<h1>Notice: Order #${order.id.substring(0,8)} is already ${order.status.toUpperCase()}.</h1>`);
            }

            await client.query(`UPDATE orders SET status = 'confirmed', payment_status = 'partially_paid' WHERE id = $1`, [order.id]);
            const remainingDues = Number(order.total_amount) - Number(order.advance_amount);
            await client.query(`UPDATE shops SET outstanding_balance = outstanding_balance + $1 WHERE id = $2`, [remainingDues, order.shop_id]);

            await client.query('COMMIT');
            client.release();

            store.approveOrderWithDiscount(order.id, { discountAmount: 0 });
            triggerWhatsAppNotification(order.client_phone, `Hi ${order.shop_name}, your order #${order.id.substring(0,8)} has been confirmed! We are packaging it now.`);
            googleSheets.syncOrderToSheets(order.id).catch(err => console.error('Google Sheets Sync Error:', err));

            res.send(`
                <html>
                    <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f7fafc;">
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); text-align: center; max-width: 450px;">
                            <h2 style="color: #48bb78; margin-bottom: 10px;">Order Approved!</h2>
                            <p style="color: #4a5568;">Order <strong>#${order.id.substring(0,8)}</strong> for <strong>${order.shop_name}</strong> is now confirmed.</p>
                            <p style="color: #718096; font-size: 14px; margin-top: 15px;">Dues of <strong>₹${remainingDues.toFixed(2)}</strong> added to shop ledger.</p>
                        </div>
                    </body>
                </html>
            `);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            throw dbErr;
        }
    } catch (error) {
        // Fallback store approval
        const orders = store.getOrders();
        const found = orders.find(o => o.quick_approve_token === token || o.id === token);
        if (found) {
            store.approveOrderWithDiscount(found.id, { discountAmount: 0 });
            return res.send(`<h1>Order #${found.id} approved successfully!</h1>`);
        }
        res.status(500).send(`<h1>Error approving order: ${error.message}</h1>`);
    }
});

// 3. Badal's Custom Review & Approval Endpoint (With Discount & Advance Adjustment)
router.post('/approve', authenticateToken, requireAdmin, async (req, res) => {
    const { orderId, discountAmount, advanceAmount } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const orderRes = await client.query(
                `SELECT o.*, s.shop_name, u.phone as client_phone 
                 FROM orders o
                 JOIN shops s ON s.id = o.shop_id
                 JOIN users u ON u.id = s.user_id
                 WHERE o.id = $1`, [orderId]
            );

            if (orderRes.rows.length === 0) {
                client.release();
                throw new Error('Order not found');
            }
            const order = orderRes.rows[0];

            const discount = parseFloat(discountAmount || 0);
            const advance = parseFloat(advanceAmount !== undefined ? advanceAmount : order.advance_amount);
            const finalBill = Number(order.total_amount) - discount;
            const remainingDues = Math.max(0, finalBill - advance);

            await client.query(
                `UPDATE orders 
                 SET status = 'confirmed', discount_amount = $1, advance_amount = $2, payment_status = 'partially_paid' 
                 WHERE id = $3`,
                [discount, advance, orderId]
            );

            await client.query(
                `UPDATE shops 
                 SET outstanding_balance = outstanding_balance + $1 
                 WHERE id = $2`,
                [remainingDues, order.shop_id]
            );

            await client.query('COMMIT');
            client.release();

            store.approveOrderWithDiscount(orderId, { discountAmount: discount, advanceAmount: advance });
            triggerWhatsAppNotification(order.client_phone, `Hi ${order.shop_name}, your order #${order.id.substring(0,8)} has been APPROVED by Badal! Final Bill: ₹${finalBill.toFixed(2)} (Discount: ₹${discount.toFixed(2)}). Remaining dues: ₹${remainingDues.toFixed(2)}.`);
            googleSheets.syncOrderToSheets(orderId).catch(err => console.error('Google Sheets Sync Error:', err));

            return res.json({
                message: 'Order approved and ledger updated successfully',
                finalBill,
                remainingDues
            });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            throw dbErr;
        }
    } catch (error) {
        const result = store.approveOrderWithDiscount(orderId, { discountAmount, advanceAmount });
        if (!result) return res.status(404).json({ error: 'Order not found in store' });
        return res.json({
            message: 'Order approved and ledger updated successfully (Store)',
            order: result.order
        });
    }
});

// 4. Assign Order to Worker (Admin Only)
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
    const { orderId, workerId } = req.body;
    if (!orderId || !workerId) {
        return res.status(400).json({ error: 'Order ID and Worker ID are required' });
    }

    try {
        await db.query(`UPDATE orders SET worker_id = $1, status = 'ready' WHERE id = $2`, [workerId, orderId]);
        store.assignWorker(orderId, workerId);
        googleSheets.syncOrderToSheets(orderId).catch(err => console.error('Google Sheets Sync Error:', err));
        res.json({ message: 'Worker assigned successfully and order is marked Ready' });
    } catch (error) {
        store.assignWorker(orderId, workerId);
        res.json({ message: 'Worker assigned successfully (Store)' });
    }
});

// 5. Update Order Status (Ready, Shipping, Delivered)
router.patch('/status', authenticateToken, async (req, res) => {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
        return res.status(400).json({ error: 'Order ID and Status are required' });
    }

    try {
        const orderRes = await db.query(
            `SELECT o.id, o.status, o.total_amount, o.advance_amount, o.worker_id, s.id as shop_id, s.shop_name, u.phone as client_phone
             FROM orders o
             JOIN shops s ON s.id = o.shop_id
             JOIN users u ON u.id = s.user_id
             WHERE o.id = $1`, [orderId]);
        
        if (orderRes.rows.length === 0) {
            throw new Error('Order not found in DB');
        }
        const order = orderRes.rows[0];

        const updated = await db.query(
            `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
            [status, orderId]
        );

        store.updateOrderStatus(orderId, status);

        if (status === 'shipping') {
            triggerWhatsAppNotification(order.client_phone, `Hi ${order.shop_name}, your order #${order.id.substring(0,8)} is OUT FOR DELIVERY!`);
        } else if (status === 'delivered') {
            triggerWhatsAppNotification(order.client_phone, `Hi ${order.shop_name}, your order #${order.id.substring(0,8)} has been DELIVERED! Thank you for ordering with Bharath Agency.`);
        }

        googleSheets.syncOrderToSheets(orderId).catch(err => console.error('Google Sheets Sync Error:', err));
        res.json({ message: `Order status updated to ${status}`, order: updated.rows[0] });
    } catch (error) {
        const updated = store.updateOrderStatus(orderId, status);
        res.json({ message: `Order status updated to ${status} (Store)`, order: updated });
    }
});

// 6. Get Orders (Role-filtered with Line Items)
router.get('/', authenticateToken, async (req, res) => {
    try {
        let queryStr = '';
        let params = [];

        if (req.user.role === 'admin') {
            queryStr = `SELECT o.*, s.shop_name, s.delivery_address, u.phone as client_phone 
                        FROM orders o 
                        JOIN shops s ON s.id = o.shop_id 
                        LEFT JOIN users u ON u.id = s.user_id
                        ORDER BY o.created_at DESC`;
        } else if (req.user.role === 'worker') {
            queryStr = `SELECT o.*, s.shop_name, s.delivery_address, u.phone as client_phone 
                        FROM orders o 
                        JOIN shops s ON s.id = o.shop_id 
                        LEFT JOIN users u ON u.id = s.user_id
                        WHERE o.worker_id = $1 AND o.status IN ('ready', 'shipping')
                        ORDER BY o.created_at DESC`;
            params = [req.user.id];
        } else {
            queryStr = `SELECT o.*, s.shop_name, s.delivery_address 
                        FROM orders o 
                        JOIN shops s ON s.id = o.shop_id 
                        WHERE s.user_id = $1 OR s.id = $1
                        ORDER BY o.created_at DESC`;
            params = [req.user.id];
        }

        const ordersRes = await db.query(queryStr, params);
        if (ordersRes.rows && ordersRes.rows.length > 0) {
            return res.json(ordersRes.rows);
        }
        
        // Return store orders
        let filter = {};
        if (req.user.role === 'client') {
            filter.shopId = req.user.shopId;
        } else if (req.user.role === 'worker') {
            filter.workerId = req.user.id;
        }
        return res.json(store.getOrders(filter));
    } catch (error) {
        let filter = {};
        if (req.user && req.user.role === 'client') {
            filter.shopId = req.user.shopId;
        } else if (req.user && req.user.role === 'worker') {
            filter.workerId = req.user.id;
        }
        return res.json(store.getOrders(filter));
    }
});

// 7. Get All Shops (Admin Only)
router.get('/shops-list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const queryStr = `SELECT s.*, u.phone, u.email FROM shops s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.shop_name ASC`;
        const shopsRes = await db.query(queryStr);
        if (shopsRes.rows && shopsRes.rows.length > 0) {
            return res.json(shopsRes.rows);
        }
        return res.json(store.getShops());
    } catch (error) {
        return res.json(store.getShops());
    }
});

// 8. Record Manual Payment towards Shop Ledger (Admin Only)
router.post('/shops/:id/payment', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { amount, method, notes } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Valid positive payment amount required' });
    }

    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE shops SET outstanding_balance = GREATEST(0, outstanding_balance - $1) WHERE id = $2', [amount, id]);
            await client.query(
                `INSERT INTO payments (shop_id, amount, payment_method, status, notes) VALUES ($1, $2, $3, 'completed', $4)`,
                [id, amount, method || 'cash', notes || 'Manual payment logged by admin']
            );
            await client.query('COMMIT');
            client.release();

            const result = store.recordShopPayment(id, amount, method, notes);
            return res.json({ message: `Payment of ₹${parseFloat(amount).toFixed(2)} recorded successfully`, shop: result ? result.shop : null });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            client.release();
            throw dbErr;
        }
    } catch (error) {
        const result = store.recordShopPayment(id, amount, method, notes);
        if (!result) return res.status(404).json({ error: 'Shop not found' });
        return res.json({ message: `Payment of ₹${parseFloat(amount).toFixed(2)} recorded successfully (Store)`, shop: result.shop });
    }
});

// 9. Integration Status (Sheets & Email)
router.get('/sheets-info', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        sheetId: process.env.GOOGLE_SHEET_ID && process.env.GOOGLE_SHEET_ID !== 'your_google_sheet_id_here' ? process.env.GOOGLE_SHEET_ID : null,
        resendConfigured: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_123456789' && process.env.BHARATH_EMAIL)
    });
});

// 10. Manual Weekly Report Trigger
router.post('/weekly-report', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { sendWeeklyReport } = require('../cron/weeklyReport');
        await sendWeeklyReport();
        res.json({ message: 'Weekly report compiled and dispatched successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send weekly report: ' + error.message });
    }
});

module.exports = router;
