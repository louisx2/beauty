import React from 'react';
import { ProductCard } from '../components/ProductCard';
import { Cart } from '../components/Cart';
import type { Product } from '../types';

// Mock data
const products: Product[] = [
  { id: '1', name: 'Coffee', price: 3.50, category: 'Beverage', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400' },
  { id: '2', name: 'Croissant', price: 2.50, category: 'Bakery', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { id: '3', name: 'Sandwich', price: 6.00, category: 'Food', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400' },
  { id: '4', name: 'Tea', price: 3.00, category: 'Beverage', image: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400' },
  { id: '5', name: 'Cake Slice', price: 4.50, category: 'Bakery', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
  { id: '6', name: 'Orange Juice', price: 4.00, category: 'Beverage', image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400' },
];

export const POSPage: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <div className="flex-1 p-6 overflow-y-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">POS System</h1>
          <p className="text-gray-500">Select products to add to order</p>
        </header>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
      
      <div className="w-96 h-full">
        <Cart />
      </div>
    </div>
  );
};
