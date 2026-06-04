const express = require('express');
const amqp = require('amqplib');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ── Database Setup ──────────────────────────────
const dbPath = process.env.DB_PATH || './data/pos.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_name TEXT,
    items TEXT,
    total_amount REAL,
    payment_method TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT
  );
`);

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const insert = db.prepare('INSERT INTO products (id, name, price, category) VALUES (?, ?, ?, ?)');
  insert.run('P001', 'Laptop Asus', 8500000, 'Electronics');
  insert.run('P002', 'Mouse Logitech', 250000, 'Accessories');
  insert.run('P003', 'Keyboard Mechanical', 650000, 'Accessories');
  insert.run('P004', 'Monitor 24inch', 3200000, 'Electronics');
  insert.run('P005', 'Headphone Sony', 1200000, 'Electronics');
  console.log('✅ Produk awal berhasil di-seed');
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

      // Fanout exchange — satu pesan ke semua subscriber
      await channel.assertExchange('sale.created.exchange', 'fanout', { durable: true });

      console.log('✅ POS terhubung ke RabbitMQ');
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

app.get('/transactions', (req, res) => {
  const transactions = db.prepare('SELECT * FROM transactions ORDER BY created_at DESC').all();
  const parsed = transactions.map(t => ({ ...t, items: JSON.parse(t.items) }));
  res.json({ success: true, data: parsed });
});

app.post('/transactions', async (req, res) => {
  const { customer_id, customer_name, items, payment_method } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Items tidak boleh kosong' });
  }

  let total_amount = 0;
  for (const item of items) {
    total_amount += item.price * item.quantity;
  }

  const transaction = {
    id: uuidv4(),
    customer_id: customer_id || 'GUEST',
    customer_name: customer_name || 'Guest',
    items: JSON.stringify(items),
    total_amount,
    payment_method: payment_method || 'cash',
    status: 'completed'
  };

  db.prepare(`
    INSERT INTO transactions (id, customer_id, customer_name, items, total_amount, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    transaction.id,
    transaction.customer_id,
    transaction.customer_name,
    transaction.items,
    transaction.total_amount,
    transaction.payment_method,
    transaction.status
  );

  if (channel) {
    const event = {
      event_type: 'sale.created',
      transaction_id: transaction.id,
      customer_id: transaction.customer_id,
      customer_name: transaction.customer_name,
      items,
      total_amount,
      payment_method: transaction.payment_method,
      timestamp: new Date().toISOString()
    };

    // Publish ke fanout exchange
    channel.publish(
      'sale.created.exchange',
      '',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    console.log(`📤 Event sale.created dikirim: ${transaction.id}`);
  }

  res.status(201).json({
    success: true,
    message: 'Transaksi berhasil dibuat',
    data: { ...transaction, items }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pos-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3001;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 POS Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});