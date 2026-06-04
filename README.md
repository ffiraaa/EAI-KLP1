# Retail Integration System
Sistem integrasi enterprise untuk bisnis retail yang menghubungkan POS, Inventory, Accounting, E-Commerce, dan CRM secara otomatis menggunakan arsitektur microservices, API Gateway, dan RabbitMQ sebagai message broker.

## Anggota Kelompok
| Nama | NIM | Kontribusi |
|------|-----|------------|
| Nama 1 | NIM 1 | POS Service, RabbitMQ Integration |
| Nama 2 | NIM 2 | Inventory & E-Commerce Service |
| Nama 3 | NIM 3 | Accounting XML Service & Transformer |
| Nama 4 | NIM 4 | API Gateway, CRM, Docker & Documentation |         

# Arsitektur Sistem
Client
   ↓
API Gateway
   ↓
POS Service
   ↓ publish sale.created
RabbitMQ Exchange (fanout)
   ├── Inventory Service
   │      ↓
   │   stock.updated
   │
   ├── Transformer Service
   │      ├── Accounting Service (XML)
   │      └── CRM Service (JSON)
   │
   └── E-Commerce Service

# Sistem yang Diintegrasikan
| Service     | Port | Database | Format     |
| ----------- | ---- | -------- | ---------- |
| POS         | 3001 | SQLite   | REST/JSON  |
| Inventory   | 3002 | SQLite   | REST/JSON  |
| Accounting  | 3003 | SQLite   | SOAP/XML   |
| E-Commerce  | 3004 | SQLite   | REST/JSON  |
| CRM         | 3005 | SQLite   | REST/JSON  |
| API Gateway | 3000 | -        | REST/JSON  |
| Transformer | 3006 | -        | JSON ↔ XML |
| RabbitMQ    | 5672 | -        | AMQP       |

# Enterprise Integration Patterns (EIP)
## 1. Publish-Subscribe
POS Service melakukan publish event `sale.created` ke RabbitMQ fanout exchange sehingga beberapa service dapat menerima event yang sama secara independen.

## 2. Message Translator
Transformer Service melakukan transformasi data dari JSON ke XML sebelum dikirim ke Accounting Service.

## 3. Canonical Data Model
Semua event penjualan dinormalisasi terlebih dahulu ke format internal standar menggunakan canonical model.

## 4. Content-Based Router
Transformer Service meroute pesan ke queue yang berbeda berdasarkan jenis event.

## 5. Message Channel
Setiap proses integrasi memiliki queue tersendiri:
* sale.created
* stock.updated
* accounting.entry
* crm.update
* ecommerce.sync

## 6. Message Endpoint / Adapter
Accounting Service menyediakan endpoint XML untuk simulasi SOAP/XML integration.

# Teknologi yang Digunakan
* Node.js
* Express.js
* RabbitMQ
* SQLite
* Docker
* Docker Compose
* XML2JS

# Cara Menjalankan Sistem
## 1. Clone Repository
git clone <repository-url>
cd retail-integration-system

## 2. Jalankan Docker Compose
docker compose up --build

## 3. Akses Service
| Service            | URL                    |
| ------------------ | ---------------------- |
| API Gateway        | http://localhost:3000  |
| POS                | http://localhost:3001  |
| Inventory          | http://localhost:3002  |
| Accounting         | http://localhost:3003  |
| E-Commerce         | http://localhost:3004  |
| CRM                | http://localhost:3005  |
| RabbitMQ Dashboard | http://localhost:15672 |

RabbitMQ Login:
Username: admin
Password: admin123

# Alur Integrasi End-to-End
1. User membuat transaksi di POS Service
2. POS publish event `sale.created`
3. Inventory Service menerima event dan mengurangi stok
4. Transformer Service:
   * membuat canonical model
   * mengubah JSON menjadi XML
   * mengirim jurnal ke Accounting
   * mengirim update ke CRM
5. Inventory publish `stock.updated`
6. Transformer meneruskan update stok ke E-Commerce
7. Semua sistem otomatis sinkron

# Contoh Payload
## Request POS (JSON)
{
  "customer_id": "C001",
  "customer_name": "Budi Santoso",
  "payment_method": "cash",
  "items": [
    {
      "product_id": "P001",
      "name": "Laptop Asus",
      "price": 8500000,
      "quantity": 1
    }
  ]
}

## Event Canonical Model
json
{
  "event_id": "uuid",
  "event_type": "sale.created",
  "transaction_id": "trx-001",
  "customer": {
    "id": "C001",
    "name": "Budi Santoso"
  },
  "items": [],
  "total_amount": 8500000,
  "payment_method": "cash"
}

## Accounting XML
xml
<?xml version="1.0" encoding="UTF-8"?>
<JournalEntry>
  <TransactionId>trx-001</TransactionId>
  <Description>Penjualan POS</Description>
  <DebitAccount>Cash</DebitAccount>
  <CreditAccount>Revenue</CreditAccount>
  <Amount>8500000</Amount>
  <Currency>IDR</Currency>
</JournalEntry>

# Endpoint Utama
| Method | Endpoint                 | Deskripsi                 |
| ------ | ------------------------ | ------------------------- |
| POST   | /api/pos/transactions    | Membuat transaksi POS     |
| GET    | /api/inventory/products  | Melihat stok inventory    |
| GET    | /api/accounting/journals | Melihat jurnal accounting |
| GET    | /api/crm/customers       | Melihat data customer     |
| GET    | /api/ecommerce/products  | Melihat produk e-commerce |

# Persistensi Data
Seluruh database dan RabbitMQ menggunakan Docker Volume sehingga data tetap tersimpan meskipun container direstart.

# Monitoring
RabbitMQ Management Dashboard digunakan untuk monitoring queue, exchange, dan message flow.
URL: http://localhost:15672

# Kesimpulan
Project ini mengimplementasikan integrasi enterprise berbasis event-driven architecture menggunakan microservices dan RabbitMQ. Sistem berhasil mengintegrasikan beberapa aplikasi heterogen dengan format data berbeda (JSON dan XML) menggunakan berbagai Enterprise Integration Patterns (EIP).