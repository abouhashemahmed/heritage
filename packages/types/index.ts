// packages/types/index.ts

export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  country: string;
  stock: number;
  categories: string[];
}

export interface Review {
  rating: number;
  comment?: string;
  userId: string;
  productId: string;
  createdAt: string;
}
