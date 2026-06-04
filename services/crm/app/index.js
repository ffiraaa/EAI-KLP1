const express = require('express');
const amqp = require('amqplib');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// ── Database Setup ──────────────────────────────
const dbPath = process.env.DB_PATH || './data/crm.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS purchase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,
    transaction_id TEXT,
    amount REAL,
    points_earned INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed customer awal
const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();
if (customerCount.count === 0) {
  const insert = db.prepare('INSERT INTO customers (id, name, email, phone, loyalty_points, total_spent, tier) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insert.run('C001', 'Budi Santoso', 'budi@email.com', '08111111111', 150, 1500000, 'silver');
  insert.run('C002', 'Siti Rahayu', 'siti@email.com', '08222222222', 50, 500000, 'bronze');
  insert.run('C003', 'Andi Wijaya', 'andi@email.com', '08333333333', 300, 3000000, 'gold');
  console.log('✅ Customer awal berhasil di-seed');
}

// ── Helper: Hitung Tier ──────────────────────────
function calculateTier(totalSpent) {
  if (totalSpent >= 5000000) return 'platinum';
  if (totalSpent >= 2000000) return 'gold';
  if (totalSpent >= 1000000) return 'silver';
  return 'bronze';
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

      await channel.assertQueue(process.env.QUEUE_CRM_UPDATE, { durable: true });

      // Subscribe ke crm.update
      channel.consume(process.env.QUEUE_CRM_UPDATE, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        console.log(`📥 Event diterima: ${event.event_type}`);

        const { customer_id, customer_name, transaction_id, total_amount } = event;

        // Cek apakah customer sudah ada
        let customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);

        if (!customer && customer_id !== 'GUEST') {
          // Buat customer baru otomatis
          db.prepare(`
            INSERT INTO customers (id, name, loyalty_points, total_spent, tier)
            VALUES (?, ?, 0, 0, 'bronze')
          `).run(customer_id, customer_name || 'Unknown');

          customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
          console.log(`👤 Customer baru dibuat: ${customer_id}`);
        }

        if (customer) {
          // Hitung poin: setiap Rp 10.000 = 1 poin
          const pointsEarned = Math.floor(total_amount / 10000);
          const newPoints = customer.loyalty_points + pointsEarned;
          const newTotalSpent = customer.total_spent + total_amount;
          const newTier = calculateTier(newTotalSpent);

          db.prepare(`
            UPDATE customers 
            SET loyalty_points = ?, total_spent = ?, tier = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newPoints, newTotalSpent, newTier, customer_id);

          db.prepare(`
            INSERT INTO purchase_history (customer_id, transaction_id, amount, points_earned)
            VALUES (?, ?, ?, ?)
          `).run(customer_id, transaction_id, total_amount, pointsEarned);

          console.log(`⭐ Poin ${customer_name}: +${pointsEarned} poin (total: ${newPoints}) | Tier: ${newTier}`);
        }

        channel.ack(msg);
      });

      console.log('✅ CRM terhubung ke RabbitMQ & siap menerima event');
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

// GET semua customer
app.get('/customers', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers ORDER BY total_spent DESC').all();
  res.json({ success: true, data: customers });
});

// GET satu customer
app.get('/customers/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ success: false, message: 'Customer tidak ditemukan' });
  res.json({ success: true, data: customer });
});

// GET riwayat pembelian customer
app.get('/customers/:id/history', (req, res) => {
  const history = db.prepare('SELECT * FROM purchase_history WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ success: true, data: history });
});

// GET health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3005;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CRM Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});