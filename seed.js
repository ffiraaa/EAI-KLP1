async function seedData() {
  try {
    console.log('Loging in...');
    const loginRes = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Token acquired.');

    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const transactions = [
      {
        customer_id: 'C001',
        customer_name: 'Budi Santoso',
        payment_method: 'credit_card',
        items: [
          { product_id: 'P001', name: 'Laptop Asus', price: 8500000, quantity: 1 },
          { product_id: 'P002', name: 'Mouse Logitech', price: 250000, quantity: 2 }
        ]
      },
      {
        customer_id: 'C002',
        customer_name: 'Siti Rahayu',
        payment_method: 'cash',
        items: [
          { product_id: 'P004', name: 'Monitor 24inch', price: 3200000, quantity: 1 }
        ]
      },
      {
        customer_id: 'C003',
        customer_name: 'Andi Wijaya',
        payment_method: 'debit',
        items: [
          { product_id: 'P003', name: 'Keyboard Mechanical', price: 650000, quantity: 3 },
          { product_id: 'P005', name: 'Headphone Sony', price: 1200000, quantity: 1 }
        ]
      },
      {
        customer_id: 'GUEST',
        customer_name: 'Guest',
        payment_method: 'cash',
        items: [
          { product_id: 'P002', name: 'Mouse Logitech', price: 250000, quantity: 1 }
        ]
      }
    ];

    console.log('Seeding POS transactions...');
    for (const tx of transactions) {
      const res = await fetch('http://localhost:3000/api/pos/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify(tx)
      });
      const data = await res.json();
      console.log(`Created transaction for ${tx.customer_name}: ${res.status}`);
      await new Promise(r => setTimeout(r, 500));
    }

    const orders = [
      {
        customer_id: 'C001',
        customer_name: 'Budi Santoso',
        items: [
          { product_id: 'P005', name: 'Headphone Sony', price: 1200000, quantity: 2 }
        ]
      },
      {
        customer_id: 'C003',
        customer_name: 'Andi Wijaya',
        items: [
          { product_id: 'P001', name: 'Laptop Asus', price: 8500000, quantity: 1 },
          { product_id: 'P004', name: 'Monitor 24inch', price: 3200000, quantity: 2 }
        ]
      }
    ];

    console.log('Seeding Ecommerce Orders...');
    for (const order of orders) {
      const res = await fetch('http://localhost:3000/api/ecommerce/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(order)
      });
      console.log(`Created order for ${order.customer_name}: ${res.status}`);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('Data seeded successfully!');
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

seedData();
