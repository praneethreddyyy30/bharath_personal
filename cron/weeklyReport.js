const cron = require('node-cron');
const db = require('../db');
require('dotenv').config();

/**
 * Generate and send the weekly email report of sales and ledger metrics to Bharath.
 */
async function generateWeeklyReport() {
    console.log('[CRON] Generating weekly report...');

    if (!process.env.RESEND_API_KEY || !process.env.BHARATH_EMAIL) {
        console.warn('[CRON] Weekly report skipped: RESEND_API_KEY or BHARATH_EMAIL not configured in .env');
        return;
    }

    try {
        // 1. Calculate stats for the last 7 days
        const statsRes = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                COALESCE(SUM(total_amount), 0) as total_sales,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
                COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as delivered_sales
            FROM orders
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);
        const stats = statsRes.rows[0];

        // 2. Fetch sum of outstanding balances from all shops
        const balanceRes = await db.query(`
            SELECT COALESCE(SUM(outstanding_balance), 0) as total_outstanding 
            FROM shops
        `);
        const totalOutstanding = balanceRes.rows[0].total_outstanding;

        // 3. Fetch top 5 shops with highest outstanding balance
        const debtorRes = await db.query(`
            SELECT shop_name, outstanding_balance 
            FROM shops 
            WHERE outstanding_balance > 0 
            ORDER BY outstanding_balance DESC 
            LIMIT 5
        `);
        const topDebtors = debtorRes.rows;

        // 4. Build HTML report
        let debtorsHtml = '';
        if (topDebtors.length > 0) {
            debtorsHtml = `
                <h3>Top Shops with Outstanding Balances</h3>
                <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #edf2f7; border-bottom: 2px solid #cbd5e0; text-align: left;">
                            <th style="padding: 8px;">Shop Name</th>
                            <th style="padding: 8px; text-align: right;">Owed Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topDebtors.map(d => `
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                <td style="padding: 8px;">${d.shop_name}</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: #e53e3e;">₹${Number(d.outstanding_balance).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            debtorsHtml = '<p style="color: #48bb78; font-weight: bold;">All shops have cleared their ledger dues!</p>';
        }

        const htmlBody = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #2d3748; line-height: 1.6;">
                <div style="background-color: #3182ce; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h2 style="margin: 0;">Weekly Performance Summary</h2>
                    <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Bharath's Paper Products Agency</p>
                </div>
                <div style="padding: 24px; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                    <p>Hi Bharath,</p>
                    <p>Here is your business summary for the last 7 days:</p>
                    
                    <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                        <div style="flex: 1; background: #ebf8ff; padding: 15px; border-radius: 6px; text-align: center; margin-right: 10px;">
                            <span style="font-size: 12px; color: #2b6cb0; text-transform: uppercase; font-weight: bold;">New Orders</span>
                            <h2 style="margin: 5px 0 0; color: #2b6cb0;">${stats.total_orders}</h2>
                        </div>
                        <div style="flex: 1; background: #e6fffa; padding: 15px; border-radius: 6px; text-align: center; margin-left: 10px;">
                            <span style="font-size: 12px; color: #234e52; text-transform: uppercase; font-weight: bold;">Total Revenue</span>
                            <h2 style="margin: 5px 0 0; color: #234e52;">₹${Number(stats.total_sales).toFixed(2)}</h2>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="border-bottom: 1px solid #edf2f7;">
                            <td style="padding: 10px 0; color: #718096;">Orders Delivered</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold;">${stats.delivered_orders}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #edf2f7;">
                            <td style="padding: 10px 0; color: #718096;">Delivered Goods Revenue</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #319795;">₹${Number(stats.delivered_sales).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #718096;">Outstanding Credit (All Shops)</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #e53e3e;">₹${Number(totalOutstanding).toFixed(2)}</td>
                        </tr>
                    </table>

                    <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />

                    ${debtorsHtml}

                    <p style="margin-top: 30px; font-size: 12px; color: #a0aec0; text-align: center;">
                        This is an automated weekly report sent to ${process.env.BHARATH_EMAIL}.
                    </p>
                </div>
            </div>
        `;

        // Send using Resend API via fetch (native in modern Node)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Bharath Agency <onboarding@resend.dev>', // Acquired domain in production
                to: process.env.BHARATH_EMAIL,
                subject: `Weekly Report: ${new Date().toLocaleDateString('en-IN')}`,
                html: htmlBody
            })
        });

        const resData = await response.json();
        if (response.ok) {
            console.log('[CRON] Weekly report email sent successfully:', resData.id);
        } else {
            console.error('[CRON ERROR] Failed to send email via Resend API:', resData);
        }
    } catch (error) {
        console.error('[CRON ERROR] Failed to process weekly report:', error.message);
    }
}

// Schedule cron to run every Sunday at 10:00 PM (22:00) IST
// Note: '0 22 * * 0' (0 = Sunday in standard cron, though node-cron supports Sunday=7 as well. We'll use 0).
cron.schedule('0 22 * * 0', () => {
    generateWeeklyReport();
});

module.exports = { generateWeeklyReport };
