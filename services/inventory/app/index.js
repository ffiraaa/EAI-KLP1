const express = require('express');
const amqp = require('amqplib');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ── Database Setup ──────────────────────────────
const dbPath = process.env.DB_PATH || './data/inventory.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    price REAL,
    category TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT,
    type TEXT,
    quantity INTEGER,
    reference_id TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const insert = db.prepare('INSERT INTO products (id, name, stock, min_stock, price, category) VALUES (?, ?, ?, ?, ?, ?)');
  insert.run('P001', 'Laptop Asus', 50, 5, 8500000, 'Electronics');
  insert.run('P002', 'Mouse Logitech', 150, 10, 250000, 'Accessories');
  insert.run('P003', 'Keyboard Mechanical', 80, 10, 650000, 'Accessories');
  insert.run('P004', 'Monitor 24inch', 30, 5, 3200000, 'Electronics');
  insert.run('P005', 'Headphone Sony', 60, 5, 1200000, 'Electronics');
  console.log('✅ Stok awal berhasil di-seed');
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

      await channel.assertExchange('sale.created.exchange', 'fanout', { durable: true });
      await channel.assertQueue(process.env.QUEUE_STOCK_UPDATED, { durable: true });

      // Queue khusus inventory — terhubung ke fanout exchange
      const q = await channel.assertQueue('sale.created.inventory', { durable: true });
      await channel.bindQueue(q.queue, 'sale.created.exchange', '');

      channel.consume(q.queue, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        console.log(`📥 Event diterima: ${event.event_type} — ${event.transaction_id}`);

        const updatedProducts = [];

        for (const item of event.items) {
          const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);

          if (product) {
            const newStock = product.stock - item.quantity;

            db.prepare(`
              UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(newStock, item.product_id);

            db.prepare(`
              INSERT INTO stock_movements (product_id, type, quantity, reference_id, note)
              VALUES (?, 'out', ?, ?, 'Penjualan via POS')
            `).run(item.product_id, item.quantity, event.transaction_id);

            updatedProducts.push({
              product_id: item.product_id,
              name: product.name,
              old_stock: product.stock,
              new_stock: newStock
            });

            console.log(`📦 Stok ${product.name}: ${product.stock} → ${newStock}`);
          }
        }

        const stockEvent = {
          event_type: 'stock.updated',
          transaction_id: event.transaction_id,
          updated_products: updatedProducts,
          timestamp: new Date().toISOString()
        };

        channel.sendToQueue(
          process.env.QUEUE_STOCK_UPDATED,
          Buffer.from(JSON.stringify(stockEvent)),
          { persistent: true }
        );

        channel.ack(msg);
      });

      console.log('✅ Inventory terhubung ke RabbitMQ & siap menerima event');
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

app.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all();
  res.json({ success: true, data: products });
});

app.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
  res.json({ success: true, data: product });
});

app.get('/movements', (req, res) => {
  const movements = db.prepare('SELECT * FROM stock_movements ORDER BY created_at DESC').all();
  res.json({ success: true, data: movements });
});

app.post('/products/:id/restock', (req, res) => {
  const { quantity, note } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

  const newStock = product.stock + quantity;
  db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, req.params.id);
  db.prepare(`
    INSERT INTO stock_movements (product_id, type, quantity, note)
    VALUES (?, 'in', ?, ?)
  `).run(req.params.id, quantity, note || 'Restock manual');

  res.json({ success: true, message: 'Stok berhasil ditambah', data: { ...product, stock: newStock } });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3002;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Inventory Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});