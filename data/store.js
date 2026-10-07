const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const DB_FILE = path.join(DATA_DIR, 'store.json');

// Initial comprehensive B2B Wholesale Seed Data
const INITIAL_DATA = {
    products: [
        {
            id: "prod-cups-100",
            name: "100ml Heavy Paper Tea Cups (100 pcs/pack)",
            description: "Heavy leak-proof virgin board base. Food grade, thermal insulated for boiling hot chai & filter coffee.",
            unit_price: 1.20,
            stock_quantity: 25000,
            min_order_quantity: 100,
            category: "cups",
            image_url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-cups-250",
            name: "250ml Ripple Wall Juice Cups (50 pcs/pack)",
            description: "Triple layer ripple wall for maximum grip and insulation. Perfect for cold shakes, juices, and specialty coffees.",
            unit_price: 2.40,
            stock_quantity: 18000,
            min_order_quantity: 100,
            category: "cups",
            image_url: "https://images.unsplash.com/photo-1618335829737-2228915674e0?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-cups-65",
            name: "65ml Espresso & Cutting Chai Cups (100 pcs/pack)",
            description: "Traditional roadside stall cutting chai portion cup. Rigid rolled rim prevents bending and spills.",
            unit_price: 0.85,
            stock_quantity: 40000,
            min_order_quantity: 200,
            category: "cups",
            image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-plates-10",
            name: "10-inch Rigid Buffet Dinner Plates (50 pcs/pack)",
            description: "Heavyweight grease-proof catering plate. Withstands heavy meals, gravies, and rice without sagging.",
            unit_price: 3.80,
            stock_quantity: 12000,
            min_order_quantity: 100,
            category: "plates",
            image_url: "https://images.unsplash.com/photo-1594911774802-8822a707caff?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-plates-7",
            name: "7-inch Snack & Chaat Paper Plates (100 pcs/pack)",
            description: "Square base with raised raised lip. Biodegradable and perfect for bakeries, snacks, and chaat stalls.",
            unit_price: 1.50,
            stock_quantity: 20000,
            min_order_quantity: 100,
            category: "plates",
            image_url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-plates-meal",
            name: "5-Compartment Heavy Thali Meal Trays (50 pcs/pack)",
            description: "Sturdy bagasse sugarcane pulp thali tray with deep section dividers. Ideal for mess, hotels, and event buffets.",
            unit_price: 6.50,
            stock_quantity: 8000,
            min_order_quantity: 50,
            category: "plates",
            image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-spoons-wooden",
            name: "Eco Birchwood Dessert Spoons (100 pcs/pack)",
            description: "100% natural smooth-polished birchwood cutlery. Chemical-free, splinter-free, heat-resistant and biodegradable.",
            unit_price: 0.95,
            stock_quantity: 30000,
            min_order_quantity: 100,
            category: "spoons",
            image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-spoons-soup",
            name: "Cornstarch Biodegradable Soup Spoons (100 pcs/pack)",
            description: "Heavy-gauge CPLA cornstarch formulation. Strong deep bowl suitable for piping hot soups, curries, and desserts.",
            unit_price: 1.40,
            stock_quantity: 15000,
            min_order_quantity: 100,
            category: "spoons",
            image_url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        },
        {
            id: "prod-straws-paper",
            name: "Individually Wrapped Paper Straws (250 pcs/box)",
            description: "4-ply thick craft paper construction. Remains rigid in liquid for over 4 hours. Hygenic individual food-grade wrapping.",
            unit_price: 0.60,
            stock_quantity: 50000,
            min_order_quantity: 250,
            category: "spoons",
            image_url: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=500&auto=format&fit=crop&q=80",
            is_active: true,
            created_at: new Date().toISOString()
        }
    ],
    shops: [
        {
            id: "shop-ambika-1",
            user_id: "user-shop-ambika",
            shop_name: "Ambika Bakery & Sweets",
            delivery_address: "Shop #14, Main Bazaar, Old Town, Hyderabad",
            phone: "9876543210",
            credit_limit: 15000.00,
            outstanding_balance: 3500.00,
            created_at: new Date(Date.now() - 30 * 86400000).toISOString()
        },
        {
            id: "shop-krishna-2",
            user_id: "user-shop-krishna",
            shop_name: "Sri Krishna Tea & Tiffins",
            delivery_address: "Opposite RTC Bus Stand, Station Road, Secunderabad",
            phone: "9988776655",
            credit_limit: 10000.00,
            outstanding_balance: 0.00,
            created_at: new Date(Date.now() - 20 * 86400000).toISOString()
        },
        {
            id: "shop-quality-3",
            user_id: "user-shop-quality",
            shop_name: "Quality Catering & Fast Food",
            delivery_address: "Plot #42, Industrial Area, Ring Road, Hyderabad",
            phone: "9123456789",
            credit_limit: 25000.00,
            outstanding_balance: 5800.00,
            created_at: new Date(Date.now() - 15 * 86400000).toISOString()
        }
    ],
    workers: [
        {
            id: "worker-ramesh",
            name: "Ramesh Kumar",
            phone: "9900887766",
            role: "worker",
            status: "active"
        },
        {
            id: "worker-suresh",
            name: "Suresh Verma",
            phone: "9811223344",
            role: "worker",
            status: "active"
        }
    ],
    orders: [
        {
            id: "ord-8241",
            shop_id: "shop-ambika-1",
            shop_name: "Ambika Bakery & Sweets",
            delivery_address: "Shop #14, Main Bazaar, Old Town, Hyderabad",
            client_phone: "9876543210",
            total_amount: 3200.00,
            advance_amount: 960.00,
            discount_amount: 0.00,
            status: "placed",
            payment_status: "partially_paid",
            worker_id: null,
            worker_name: null,
            quick_approve_token: "tok-demo-8241",
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
            items: [
                {
                    productId: "prod-cups-100",
                    name: "100ml Heavy Paper Tea Cups (100 pcs/pack)",
                    quantity: 2000,
                    unitPrice: 1.20,
                    itemTotal: 2400.00
                },
                {
                    productId: "prod-plates-7",
                    name: "7-inch Snack & Chaat Paper Plates (100 pcs/pack)",
                    quantity: 533,
                    unitPrice: 1.50,
                    itemTotal: 800.00
                }
            ]
        },
        {
            id: "ord-5122",
            shop_id: "shop-quality-3",
            shop_name: "Quality Catering & Fast Food",
            delivery_address: "Plot #42, Industrial Area, Ring Road, Hyderabad",
            client_phone: "9123456789",
            total_amount: 7600.00,
            advance_amount: 2280.00,
            discount_amount: 500.00,
            status: "shipping",
            payment_status: "partially_paid",
            worker_id: "worker-ramesh",
            worker_name: "Ramesh Kumar",
            quick_approve_token: "tok-demo-5122",
            created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
            items: [
                {
                    productId: "prod-plates-10",
                    name: "10-inch Rigid Buffet Dinner Plates (50 pcs/pack)",
                    quantity: 1000,
                    unitPrice: 3.80,
                    itemTotal: 3800.00
                },
                {
                    productId: "prod-plates-meal",
                    name: "5-Compartment Heavy Thali Meal Trays (50 pcs/pack)",
                    quantity: 584,
                    unitPrice: 6.50,
                    itemTotal: 3800.00
                }
            ]
        },
        {
            id: "ord-3109",
            shop_id: "shop-ambika-1",
            shop_name: "Ambika Bakery & Sweets",
            delivery_address: "Shop #14, Main Bazaar, Old Town, Hyderabad",
            client_phone: "9876543210",
            total_amount: 4500.00,
            advance_amount: 1350.00,
            discount_amount: 300.00,
            status: "delivered",
            payment_status: "paid",
            worker_id: "worker-suresh",
            worker_name: "Suresh Verma",
            quick_approve_token: "tok-demo-3109",
            created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
            items: [
                {
                    productId: "prod-cups-250",
                    name: "250ml Ripple Wall Juice Cups (50 pcs/pack)",
                    quantity: 1500,
                    unitPrice: 2.40,
                    itemTotal: 3600.00
                },
                {
                    productId: "prod-spoons-wooden",
                    name: "Eco Birchwood Dessert Spoons (100 pcs/pack)",
                    quantity: 947,
                    unitPrice: 0.95,
                    itemTotal: 900.00
                }
            ]
        }
    ],
    payments: [
        {
            id: "pay-101",
            shop_id: "shop-ambika-1",
            order_id: "ord-3109",
            amount: 2850.00,
            payment_method: "cash",
            status: "completed",
            notes: "Collected at delivery by Suresh",
            created_at: new Date(Date.now() - 5 * 86400000).toISOString()
        }
    ]
};

class Store {
    constructor() {
        this.data = null;
        this.init();
    }

    init() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
            if (!fs.existsSync(DB_FILE)) {
                this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
                this.save();
                console.log('📦 [STORE] Initialized store.json with default seed data.');
            } else {
                const content = fs.readFileSync(DB_FILE, 'utf8');
                this.data = JSON.parse(content);
                // Ensure all arrays exist
                if (!this.data.products) this.data.products = INITIAL_DATA.products;
                if (!this.data.shops) this.data.shops = INITIAL_DATA.shops;
                if (!this.data.workers) this.data.workers = INITIAL_DATA.workers;
                if (!this.data.orders) this.data.orders = INITIAL_DATA.orders;
                if (!this.data.payments) this.data.payments = INITIAL_DATA.payments;
            }
        } catch (err) {
            console.error('⚠️ [STORE ERROR] Failed to load store.json, using in-memory fallback:', err.message);
            this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
        }
    }

    save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (err) {
            console.error('⚠️ [STORE SAVE ERROR]:', err.message);
        }
    }

    // --- PRODUCTS ---
    getProducts(onlyActive = false) {
        if (onlyActive) {
            return this.data.products.filter(p => p.is_active);
        }
        return this.data.products;
    }

    getProductById(id) {
        return this.data.products.find(p => p.id === id);
    }

    saveProduct(productData) {
        if (productData.id) {
            const index = this.data.products.findIndex(p => p.id === productData.id);
            if (index !== -1) {
                this.data.products[index] = { ...this.data.products[index], ...productData };
                this.save();
                return this.data.products[index];
            }
        }
        const newProduct = {
            id: productData.id || "prod-" + Date.now().toString(36),
            name: productData.name,
            description: productData.description || "",
            unit_price: parseFloat(productData.unitPrice || productData.unit_price || 0),
            stock_quantity: parseInt(productData.stockQuantity || productData.stock_quantity || 0),
            min_order_quantity: parseInt(productData.minOrderQuantity || productData.min_order_quantity || 1),
            category: productData.category || "cups",
            image_url: productData.imageUrl || productData.image_url || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80",
            is_active: productData.isActive !== undefined ? productData.isActive : true,
            created_at: new Date().toISOString()
        };
        this.data.products.push(newProduct);
        this.save();
        return newProduct;
    }

    archiveProduct(id) {
        const product = this.data.products.find(p => p.id === id);
        if (product) {
            product.is_active = false;
            this.save();
            return product;
        }
        return null;
    }

    // --- SHOPS ---
    getShops() {
        return this.data.shops;
    }

    getShopById(id) {
        return this.data.shops.find(s => s.id === id || s.user_id === id);
    }

    getShopByUserId(userId) {
        return this.data.shops.find(s => s.user_id === userId);
    }

    addShop(shopData) {
        const newShop = {
            id: shopData.id || "shop-" + Date.now().toString(36),
            user_id: shopData.user_id || "user-" + Date.now().toString(36),
            shop_name: shopData.shop_name,
            delivery_address: shopData.delivery_address || "",
            phone: shopData.phone || "",
            credit_limit: parseFloat(shopData.credit_limit || 10000),
            outstanding_balance: parseFloat(shopData.outstanding_balance || 0),
            created_at: new Date().toISOString()
        };
        this.data.shops.push(newShop);
        this.save();
        return newShop;
    }

    recordShopPayment(shopId, amount, method = 'cash', notes = '') {
        const shop = this.data.shops.find(s => s.id === shopId);
        if (!shop) return null;

        const numAmount = parseFloat(amount);
        shop.outstanding_balance = Math.max(0, shop.outstanding_balance - numAmount);
        
        const paymentRecord = {
            id: "pay-" + Date.now().toString(36),
            shop_id: shop.id,
            amount: numAmount,
            payment_method: method,
            status: "completed",
            notes: notes || "Manual payment recorded",
            created_at: new Date().toISOString()
        };
        this.data.payments.push(paymentRecord);
        this.save();
        return { shop, paymentRecord };
    }

    // --- WORKERS ---
    getWorkers() {
        return this.data.workers;
    }

    addWorker(workerData) {
        const newWorker = {
            id: workerData.id || "worker-" + Date.now().toString(36),
            name: workerData.name,
            phone: workerData.phone,
            role: "worker",
            status: "active"
        };
        this.data.workers.push(newWorker);
        this.save();
        return newWorker;
    }

    // --- ORDERS ---
    getOrders(filter = {}) {
        let list = [...this.data.orders];
        if (filter.shopId) {
            list = list.filter(o => o.shop_id === filter.shopId);
        }
        if (filter.workerId) {
            list = list.filter(o => o.worker_id === filter.workerId);
        }
        if (filter.status) {
            list = list.filter(o => o.status === filter.status);
        }
        return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    getOrderById(id) {
        return this.data.orders.find(o => o.id === id);
    }

    createOrder({ shopId, items, advanceAmount }) {
        const shop = this.getShopById(shopId) || this.data.shops[0];
        
        let totalAmount = 0;
        const processedItems = [];

        items.forEach(item => {
            const product = this.getProductById(item.productId);
            if (product) {
                const itemTotal = Number(product.unit_price) * item.quantity;
                totalAmount += itemTotal;
                processedItems.push({
                    productId: product.id,
                    name: product.name,
                    quantity: item.quantity,
                    unitPrice: Number(product.unit_price),
                    itemTotal
                });
            }
        });

        const calculatedAdvance = advanceAmount !== undefined ? advanceAmount : (totalAmount * 0.30);
        const orderId = "ord-" + Math.floor(1000 + Math.random() * 9000);

        const newOrder = {
            id: orderId,
            shop_id: shop ? shop.id : "shop-ambika-1",
            shop_name: shop ? shop.shop_name : "Ambika Bakery & Sweets",
            delivery_address: shop ? shop.delivery_address : "Hyderabad",
            client_phone: shop ? shop.phone : "9876543210",
            total_amount: totalAmount,
            advance_amount: calculatedAdvance,
            discount_amount: 0.00,
            status: "placed",
            payment_status: "partially_paid",
            worker_id: null,
            worker_name: null,
            quick_approve_token: "tok-" + Date.now().toString(36),
            created_at: new Date().toISOString(),
            items: processedItems
        };

        this.data.orders.unshift(newOrder);
        this.save();
        return newOrder;
    }

    approveOrderWithDiscount(orderId, { discountAmount, advanceAmount }) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (!order) return null;

        if (discountAmount !== undefined) order.discount_amount = parseFloat(discountAmount);
        if (advanceAmount !== undefined) order.advance_amount = parseFloat(advanceAmount);
        order.status = "confirmed";

        // Update shop outstanding ledger
        const finalBill = order.total_amount - order.discount_amount;
        const remainingDues = Math.max(0, finalBill - order.advance_amount);

        const shop = this.getShopById(order.shop_id);
        if (shop) {
            shop.outstanding_balance += remainingDues;
        }

        this.save();
        return { order, shop };
    }

    assignWorker(orderId, workerId) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (!order) return null;

        const worker = this.data.workers.find(w => w.id === workerId);
        order.worker_id = workerId;
        order.worker_name = worker ? worker.name : "Assigned Worker";
        order.status = "ready";
        this.save();
        return order;
    }

    updateOrderStatus(orderId, status) {
        const order = this.data.orders.find(o => o.id === orderId);
        if (!order) return null;

        order.status = status;
        if (status === 'delivered') {
            order.payment_status = 'paid';
        }
        this.save();
        return order;
    }
}

// Singleton store instance
const storeInstance = new Store();
module.exports = storeInstance;
