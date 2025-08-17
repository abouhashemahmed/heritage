'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
} from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash.debounce';

const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return action.payload;
    case 'ADD': {
      const existing = state.find(item => item.id === action.payload.id);
      if (existing) {
        const newQty = existing.quantity + action.payload.quantity;
        const maxQty = existing.stock ?? Infinity; // Stock-aware limit
        return state.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: Math.min(newQty, maxQty) }
            : item
        );
      }
      return [...state, action.payload];
    }
    case 'UPDATE':
      return state.map(item =>
        item.id === action.payload.id
          ? {
              ...item,
              quantity: Math.max(
                1, // Minimum 1
                Math.min(
                  item.stock ?? Infinity, // Respect stock limits
                  action.payload.quantity
                )
              ),
            }
          : item
      );
    case 'REMOVE':
      return state.filter(item => item.id !== action.payload);
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [initialized, setInitialized] = useState(false);

  // 💾 Debounced localStorage writer (500ms)
  const saveCart = useMemo(
    () =>
      debounce(cart => {
        try {
          localStorage.setItem('cart', JSON.stringify(cart));
          // Optional: Cart expiration tracking
          localStorage.setItem('cart_updated', Date.now().toString());
        } catch (err) {
          console.error('Cart save failed:', err);
        }
      }, 500),
    []
  );

  // 🔄 Initialization with expiration check
  useEffect(() => {
    try {
      // Optional: Clear old carts (7-day expiry)
      const lastUpdated = localStorage.getItem('cart_updated');
      if (lastUpdated && Date.now() - Number(lastUpdated) > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('cart');
      }

      const stored = localStorage.getItem('cart');
      const parsed = JSON.parse(stored || '[]');
      if (Array.isArray(parsed)) {
        dispatch({ type: 'INIT', payload: parsed });
      }
    } catch (err) {
      console.error('Cart init failed:', err);
      localStorage.removeItem('cart');
    } finally {
      setInitialized(true);
    }
  }, []);

  // 💽 Persist changes
  useEffect(() => {
    if (!initialized) return;
    saveCart(cart);
  }, [cart, initialized, saveCart]);

  // 📡 Cross-tab synchronization
  useEffect(() => {
    const handleStorage = e => {
      if (e.key === 'cart') {
        try {
          const newCart = JSON.parse(e.newValue || '[]');
          if (Array.isArray(newCart)) {
            dispatch({ type: 'INIT', payload: newCart });
          }
        } catch (err) {
          console.error('Cart sync failed:', err);
          localStorage.removeItem('cart');
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ➕ Add item with validation
  const addToCart = useCallback((product, quantity = 1) => {
    if (!product?.id || typeof product.price !== 'number') {
      console.error('Invalid product:', product);
      return;
    }

    // Optional: Analytics event
    if (typeof window.analytics === 'object') {
      window.analytics.track('cart_add', { 
        productId: product.id, 
        quantity 
      });
    }

    dispatch({
      type: 'ADD',
      payload: { ...product, quantity },
    });
  }, []);

  // 🔢 Update quantity
  const updateQuantity = useCallback((id, quantity) => {
    dispatch({ type: 'UPDATE', payload: { id, quantity } });
  }, []);

  // ❌ Remove item
  const removeFromCart = useCallback(id => {
    // Optional: Analytics event
    if (typeof window.analytics === 'object') {
      window.analytics.track('cart_remove', { productId: id });
    }

    dispatch({ type: 'REMOVE', payload: id });
  }, []);

  // 🧹 Clear cart
  const clearCart = useCallback(() => {
    // Optional: Analytics event
    if (typeof window.analytics === 'object') {
      window.analytics.track('cart_clear');
    }

    dispatch({ type: 'CLEAR' });
    localStorage.removeItem('cart');
  }, []);

  // 📊 Memoized derived values
  const contextValue = useMemo(() => {
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce(
      (sum, item) => sum + item.quantity * (item.price * 100), 
      0
    ) / 100;

    return {
      cart,
      cartItemCount,
      cartTotal: Number(cartTotal.toFixed(2)), // Currency-safe
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    };
  }, [cart, addToCart, updateQuantity, removeFromCart, clearCart]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}