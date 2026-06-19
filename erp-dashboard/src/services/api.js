import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API Error]', err.message);
    if (err.response && err.response.status === 401) {
      // Optional: Handle unauthorized by redirecting to login or clearing token
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// POS
export const getPosTransactions = () => api.get('/api/pos/transactions');
export const getPosProducts = () => api.get('/api/pos/products');
export const createTransaction = (data) => api.post('/api/pos/transactions', data);

// Inventory
export const getInventoryProducts = () => api.get('/api/inventory/products');
export const restockProduct = (id, data) => api.post(`/api/inventory/products/${id}/restock`, data);

// E-Commerce
export const getEcomProducts = () => api.get('/api/ecommerce/products');
export const getEcomOrders = () => api.get('/api/ecommerce/orders');
export const createOrder = (data) => api.post('/api/ecommerce/orders', data);
export const updateOrderStatus = (id, data) => api.patch(`/api/ecommerce/orders/${id}/status`, data);

// CRM
export const getCustomers = () => api.get('/api/crm/customers');
export const getCustomer = (id) => api.get(`/api/crm/customers/${id}`);
export const getCustomerHistory = (id) => api.get(`/api/crm/customers/${id}/history`);

// Accounting
export const getJournals = () => api.get('/api/accounting/journals');
export const getJournalXml = (id) => api.get(`/api/accounting/journals/${id}/xml`);

// Health
export const getHealth = () => api.get('/health');

export default api;
