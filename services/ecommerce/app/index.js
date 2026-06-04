const express = require('express');
const amqp = require('amqplib');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ── Database Setup ──────────────────────────────
const dbPath = process.env.DB_PATH || './data/ecommerce.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    items TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed produk awal
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const insert = db.prepare('INSERT INTO products (id, name, price, stock, category, description) VALUES (?, ?, ?, ?, ?, ?)');
  insert.run('P001', 'Laptop Asus', 8500000, 50, 'Electronics', 'Laptop Asus terbaru');
  insert.run('P002', 'Mouse Logitech', 250000, 150, 'Accessories', 'Mouse wireless ergonomis');
  insert.run('P003', 'Keyboard Mechanical', 650000, 80, 'Accessories', 'Keyboard mechanical RGB');
  insert.run('P004', 'Monitor 24inch', 3200000, 30, 'Electronics', 'Monitor Full HD 24 inch');
  insert.run('P005', 'Headphone Sony', 1200000, 60, 'Electronics', 'Headphone noise cancelling');
  console.log('✅ Produk e-commerce awal berhasil di-seed');
}

// ── RabbitMQ Setup ───────────────────────────────
let channel = null;

async function connectRabbitMQ() {
  const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASS } = process.env;
  const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(url);
      channel = await conn.createChannel();

      await channel.assertQueue(process.env.QUEUE_ECOMMERCE_SYNC, { durable: true });

      // Subscribe ke ecommerce.sync — sync stok dari inventory
      channel.consume(process.env.QUEUE_ECOMMERCE_SYNC, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        console.log(`📥 Event sync stok diterima`);

        for (const item of event.updated_products) {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);

          if (product) {
            db.prepare(`
              UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(item.new_stock, item.product_id);

            // Nonaktifkan produk kalau stok habis
            if (item.new_stock <= 0) {
              db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(item.product_id);
              console.log(`⚠️ Produk ${item.name} dinonaktifkan karena stok habis`);
            }

            console.log(`🔄 Stok e-commerce ${item.name} diperbarui: ${item.new_stock}`);
          }
        }

        channel.ack(msg);
      });

      console.log('✅ E-Commerce terhubung ke RabbitMQ & siap menerima sync stok');
      return;
    } catch (err) {
      retries--;
      console.log(`⏳ Menunggu RabbitMQ... (${retries} percobaan tersisa)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  throw new Error('❌ Tidak bisa terhubung ke RabbitMQ');
}

// ── Routes ───────────────────────────────────────

// GET semua produk aktif
app.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
  res.json({ success: true, data: products });
});

// GET semua produk termasuk nonaktif
app.get('/products/all', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json({ success: true, data: products });
});

// GET satu produk
app.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  res.json({ success: true, data: product });
});

// POST buat order online
app.post('/orders', (req, res) => {
  const { customer_id, customer_name, items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items tidak boleh kosong' });
  }

  let total_amount = 0;
  for (const item of items) {
    total_amount += item.price * item.quantity;
  }

  const order = {
    id: uuidv4(),
    customer_id: customer_id || 'GUEST',
    customer_name: customer_name || 'Guest',
    items: JSON.stringify(items),
    total_amount,
    status: 'pending'
  };

  db.prepare(`
    INSERT INTO orders (id, customer_id, customer_name, items, total_amount, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(order.id, order.customer_id, order.customer_name, order.items, order.total_amount, order.status);

  res.status(201).json({ success: true, message: 'Order berhasil dibuat', data: { ...order, items } });
});

// GET semua order
app.get('/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json({ success: true, data: parsed });
});

// GET health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ecommerce-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3004;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 E-Commerce Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});