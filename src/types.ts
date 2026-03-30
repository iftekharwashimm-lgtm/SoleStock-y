export interface Brand {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  brandId: string;
  categoryId: string;
  name: string;
  variant?: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
}

export type TransactionType = 'IN' | 'OUT' | 'DELIVERY';

export interface Transaction {
  id: string;
  productId: string;
  type: TransactionType;
  quantity: number;
  date: string;
  note?: string;
  userId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}
