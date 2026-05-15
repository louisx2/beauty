import React from 'react';
import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <div 
      onClick={() => addToCart(product)}
      className="bg-white p-4 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow border border-gray-200 flex flex-col justify-between"
    >
      <div className="h-32 bg-gray-100 rounded-md mb-4 flex items-center justify-center overflow-hidden">
        {product.image ? (
            <img src={product.image} alt={product.name} className="object-cover h-full w-full" />
        ) : (
            <span className="text-gray-400">No Image</span>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-lg text-gray-800">{product.name}</h3>
        <p className="text-gray-500 text-sm">{product.category}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="font-bold text-xl text-blue-600">${product.price.toFixed(2)}</span>
          <button className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
