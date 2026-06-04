const express = require('express');
const amqp = require('amqplib');
const xml2js = require('xml2js');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const xmlBuilder = new xml2js.Builder({
  rootName: 'JournalEntry',
  xmldec: { version: '1.0', encoding: 'UTF-8' }
});

let channel = null;

// ── Canonical Data Model ─────────────────────────
function toCanonicalSaleEvent(raw) {
  return {
    event_id: uuidv4(),
    event_type: raw.event_type,
    transaction_id: raw.transaction_id,
    customer: {
      id: raw.customer_id || 'GUEST',
      name: raw.customer_name || 'Guest'
    },
    items: raw.items.map(item => ({
      product_id: item.product_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.quantity * item.price
    })),
    total_amount: raw.total_amount,
    payment_method: raw.payment_method,
    timestamp: raw.timestamp || new Date().toISOString()
  };
}

// ── Message Translator: Canonical → XML ──────────
function toAccountingXML(canonical) {
  return xmlBuilder.buildObject({
    Id: uuidv4(),
    TransactionId: canonical.transaction_id,
    EntryDate: canonical.timestamp.split('T')[0],
    Description: `Penjualan POS - ${canonical.items.map(i => i.name).join(', ')}`,
    DebitAccount: 'Cash',
    CreditAccount: 'Revenue',
    Amount: canonical.total_amount,
    Currency: 'IDR',
    Status: 'posted'
  });
}

// ── Message Translator: Canonical → CRM ──────────
function toCRMUpdate(canonical) {
  return {
    event_type: 'crm.update',
    customer_id: canonical.customer.id,
    customer_name: canonical.customer.name,
    transaction_id: canonical.transaction_id,
    total_amount: canonical.total_amount,
    timestamp: canonical.timestamp
  };
}

// ── Message Translator: Canonical → Ecommerce ────
function toEcommerceSync(canonical, updatedProducts) {
  return {
    event_type: 'ecommerce.sync',
    transaction_id: canonical.transaction_id,
    updated_products: updatedProducts,
    timestamp: canonical.timestamp
  };
}

// ── RabbitMQ Setup ───────────────────────────────
async function connectRabbitMQ() {
  const { RABBITMQ_HOST, RABBITMQ_PORT, RABBITMQ_USER, RABBITMQ_PASS } = process.env;
  const url = `amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_HOST}:${RABBITMQ_PORT}`;

  let retries = 10;
  while (retries > 0) {
    try {
      const conn = await amqp.connect(url);
      channel = await conn.createChannel();

      await channel.assertExchange('sale.created.exchange', 'fanout', { durable: true });

      const queues = [
        process.env.QUEUE_STOCK_UPDATED,
        process.env.QUEUE_ACCOUNTING_ENTRY,
        process.env.QUEUE_CRM_UPDATE,
        process.env.QUEUE_ECOMMERCE_SYNC
      ];
      for (const q of queues) {
        await channel.assertQueue(q, { durable: true });
      }

      // Queue khusus transformer — terhubung ke fanout exchange
      const q = await channel.assertQueue('sale.created.transformer', { durable: true });
      await channel.bindQueue(q.queue, 'sale.created.exchange', '');

      // Subscribe ke sale.created via exchange
      channel.consume(q.queue, async (msg) => {
        if (!msg) return;

        const raw = JSON.parse(msg.content.toString());
        console.log(`\n📨 Transformer menerima: ${raw.event_type} — ${raw.transaction_id}`);

        const canonical = toCanonicalSaleEvent(raw);
        console.log(`✅ Canonical model dibuat`);

        const accountingXML = toAccountingXML(canonical);
        channel.sendToQueue(
          process.env.QUEUE_ACCOUNTING_ENTRY,
          Buffer.from(accountingXML),
          { persistent: true }
        );
        console.log(`📤 Jurnal XML dikirim ke Accounting`);

        const crmUpdate = toCRMUpdate(canonical);
        channel.sendToQueue(
          process.env.QUEUE_CRM_UPDATE,
          Buffer.from(JSON.stringify(crmUpdate)),
          { persistent: true }
        );
        console.log(`📤 Update dikirim ke CRM`);

        channel.ack(msg);
      });

      // Subscribe ke stock.updated
      channel.consume(process.env.QUEUE_STOCK_UPDATED, async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        console.log(`\n📨 Transformer menerima: ${event.event_type}`);

        const ecommerceSync = toEcommerceSync(event, event.updated_products);
        channel.sendToQueue(
          process.env.QUEUE_ECOMMERCE_SYNC,
          Buffer.from(JSON.stringify(ecommerceSync)),
          { persistent: true }
        );
        console.log(`📤 Sync stok dikirim ke E-Commerce`);

        channel.ack(msg);
      });

      console.log('✅ Transformer siap — menunggu event masuk...');
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'transformer-service' });
});

// ── Start Server ─────────────────────────────────
const PORT = process.env.PORT || 3006;

connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Transformer Service berjalan di port ${PORT}`);
  });
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});