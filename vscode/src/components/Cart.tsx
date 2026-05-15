import React from 'react';
import { useCartStore } from '../store/cartStore';
import { Trash2, Minus, Plus } from 'lucide-react';

export const Cart: React.FC = () => {
  const { items, removeFromCart, updateQuantity, total } = useCartStore();

  return (
    <div className="flex flex-col h-full bg-white shadow-lg border-l border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Current Order</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">Cart is empty</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{item.name}</h4>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-4 text-center font-medium">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Total</span>
          <span className="text-2xl font-bold text-gray-900">${total().toFixed(2)}</span>
        </div>
        <button 
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={items.length === 0}
          onClick={() => alert('Payment processing...')}
        >
          Charge ${total().toFixed(2)}
        </button>
      </div>
    </div>
  );
};
