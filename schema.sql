-- PostgreSQL Schema for B2B Ordering & Delivery System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable for clients who log in passwordless
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'worker', 'client')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked')),
    magic_token VARCHAR(255) UNIQUE, -- Auto-login token sent via WhatsApp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shops Table (Details specific to Clients)
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    delivery_address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 10000.00,
    outstanding_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup of shops by user_id
CREATE INDEX idx_shops_user_id ON shops(user_id);

-- 3. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(12, 2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_order_quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Worker assigned to delivery
    status VARCHAR(50) NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'in_production', 'ready', 'shipping', 'delivered', 'cancelled')),
    total_amount DECIMAL(12, 2) NOT NULL,
    advance_amount DECIMAL(12, 2) NOT NULL, -- computed 30% advance
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
    quick_approve_token VARCHAR(255) UNIQUE, -- Token for WhatsApp quick approval link
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_worker_id ON orders(worker_id);

-- 5. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL -- price lock at order placement time
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- 6. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'upi_intent', 'gateway', 'credit')),
    transaction_ref VARCHAR(255), -- UPI UTR or Payment Gateway Txn ID
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Worker or Admin who collected/verified payment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);

-- 7. Trigger to automatically update updated_at on orders table
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();
