const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const db = require('../db');
require('dotenv').config();

// Initialize Google Service Account Auth
let serviceAccountAuth = null;
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

/**
 * Synchronize order details from database to Google Sheets.
 * If the row already exists, update its status. Otherwise, append a new row.
 * @param {string} orderId 
 */
async function syncOrderToSheets(orderId) {
    if (!serviceAccountAuth || !process.env.GOOGLE_SHEET_ID) {
        console.warn('[GOOGLE SHEETS] Sync skipped: Credentials or Sheet ID not configured in .env');
        return;
    }

    try {
        // Query full order details
        const orderRes = await db.query(
            `SELECT o.id, o.status, o.total_amount, o.advance_amount, o.payment_status, o.created_at,
                    s.shop_name, s.delivery_address,
                    u.phone as worker_phone
             FROM orders o
             JOIN shops s ON s.id = o.shop_id
             LEFT JOIN users u ON u.id = o.worker_id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderRes.rows.length === 0) {
            console.error(`[GOOGLE SHEETS] Order ${orderId} not found in database for sync.`);
            return;
        }

        const order = orderRes.rows[0];

        // Format dates and values
        const formattedDate = new Date(order.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const dataRow = {
            'Order ID': order.id.substring(0, 8),
            'Date (IST)': formattedDate,
            'Shop Name': order.shop_name,
            'Address': order.delivery_address,
            'Total Amount (₹)': Number(order.total_amount).toFixed(2),
            '30% Advance (₹)': Number(order.advance_amount).toFixed(2),
            'Status': order.status,
            'Payment Status': order.payment_status,
            'Assigned Worker': order.worker_phone || 'Unassigned'
        };

        // Connect to Google Sheets
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
        await doc.loadInfo();

        const sheet = doc.sheetsByIndex[0]; // Sync to the first tab

        // Read all rows to check if this Order ID exists
        const rows = await sheet.getRows();
        const existingRow = rows.find(r => r.get('Order ID') === order.id.substring(0, 8));

        if (existingRow) {
            // Update existing row status & details
            existingRow.set('Status', dataRow['Status']);
            existingRow.set('Payment Status', dataRow['Payment Status']);
            existingRow.set('Assigned Worker', dataRow['Assigned Worker']);
            await existingRow.save();
            console.log(`[GOOGLE SHEETS] Updated order ${orderId.substring(0,8)} in spreadsheet.`);
        } else {
            // Check headers. If sheet is empty, establish headers first
            if (sheet.headerValues.length === 0) {
                await sheet.setHeaderRow(Object.keys(dataRow));
            }
            // Append new row
            await sheet.addRow(dataRow);
            console.log(`[GOOGLE SHEETS] Appended new order ${orderId.substring(0,8)} to spreadsheet.`);
        }
    } catch (error) {
        console.error('[GOOGLE SHEETS ERROR] Failed to sync order:', error.message);
    }
}

module.exports = { syncOrderToSheets };
