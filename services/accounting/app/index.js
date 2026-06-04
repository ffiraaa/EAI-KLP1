const express = require('express');
const amqp = require('amqplib');
const Database = require('better-sqlite3');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.text({ type: 'text/xml' }));

// ── Database Setup ──────────────────────────────
const dbPath = process.env.DB_PATH || './data/accounting.db';
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    entry_date TEXT,
    description TEXT,
    debit_account TEXT,
    credit_account TEXT,
    amount REAL,
    currency TEXT DEFAULT 'IDR',
    status TEXT DEFAULT 'posted',
    raw_xml TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── XML Builder & Parser ─────────────────────────
const xmlBuilder = new xml2js.Builder({ rootName: 'JournalEntry', xmldec: { version: '1.0', encoding: 'UTF-8' } });
const xmlParser = new xml2js.Parser({ explicitArray: false });

function buildJournalXML(entry) {
  return xmlBuilder.buildObject({
    Id: entry.id,
    TransactionId: entry.transaction_id,
    EntryDate: entry.entry_date,
    Description: entry.description,
    DebitAccount: entry.debit_account,
    CreditAccount: entry.credit_account,
    Amount: entry.amount,
    Currency: entry.currency,
    Status: entry.status
  });
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

      await channel.assertQueue(process.env.QUEUE_ACCOUNTING_ENTRY, { durable: true });

      // Subscribe ke accounting.entry — terima data dalam format XML
      channel.consume(process.env.QUEUE_ACCOUNTING_ENTRY, async (msg) => {
        if (!msg) return;

        const rawXml = msg.content.toString();
        console.log(`📥 Menerima jurnal dalam XML`);

        try {
          // Parse XML → JSON (Message Translator pattern)
          const parsed = await xmlParser.parseStringPromise(rawXml);
          const entry = parsed.JournalEntry;

          db.prepare(`
            INSERT OR IGNORE INTO journal_entries 
            (id, transaction_id, entry_date, description, debit_account, credit_account, amount, currency, status, raw_xml)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            entry.Id,
            entry.TransactionId,
            entry.EntryDate,
            entry.Description,
            entry.DebitAccount,
            entry.CreditAccount,
            parseFloat(entry.Amount),
            entry.Currency,
            entry.Status,
            rawXml
          );

          console.log(`✅ Jurnal tercatat: ${entry.Id} — Rp ${entry.Amount}`);
          channel.ack(msg);
        } catch (err) {
          console.error('❌ Gagal parse XML:', err.message);
          channel.nack(msg, false, false); // kirim ke dead-letter
        }
      });

      console.log('✅ Accounting terhubung ke RabbitMQ & siap menerima jurnal XML');
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

// GET semua jurnal (JSON)
app.get('/journals', (req, res) => {
  const journals = db.prepare('SELECT * FROM journal_entries ORDER BY created_at DESC').all();
  res.json({ success: true, data: journals });
});

// GET satu jurnal dalam format XML (simulasi SOAP response)
app.get('/journals/:id/xml', (req, res) => {
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: 'Jurnal tidak ditemukan' });

  const xml = buildJournalXML(entry);
  res.set('Content-Type', 'text/xml');
  res.send(xml);
});

// POST terima jurnal dalam format XML langsung (simulasi SOAP endpoint)
app.post('/journals/xml', async (req, res) => {
  try {
    const parsed = await xmlParser.parseStringPromise(req.body);
    const entry = parsed.JournalEntry;

    const id = entry.Id || uuidv4();

    db.prepare(`
      INSERT OR IGNORE INTO journal_entries
      (id, transaction_id, entry_date, description, debit_account, credit_account, amount, currency, status, raw_xml)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.TransactionId,
      entry.EntryDate,
      entry.Description,
      entry.DebitAccount,
      entry.CreditAccount,
      parseFloat(entry.Amount),
      entry.Currency || 'IDR',
      entry.Status || 'posted',
      req.body
    );

    const responseXml = xmlBuilder.buildObject({
      Status: 'success',
      Message: 'Jurnal berhasil dicatat',
      Id: id
    });

    res.set('Content-Type', 'text/xml');
    res.send(responseXml);
  } catch (err) {
    res.status(400).json({ success: false, message: 'Format XML tidak valid' });
  }
});

// GET health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'accounting-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3003;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Accounting Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});