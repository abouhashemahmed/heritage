'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShoppingCartIcon, UserIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, logout, cartItemCount = 0 } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  const isActive = (path) => pathname === path;

  const activeClass = (path) =>
    `hover:text-ourArabGreen transition ${
      isActive(path)
        ? 'text-ourArabGreen border-b-2 border-ourArabGreen'
        : 'text-gray-600'
    }`;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) setIsMenuOpen(false);
      if (!userMenuRef.current?.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white shadow-md z-50 relative" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-ourArabGreen rounded"
            aria-label="Home"
          >
            <span className="text-xl font-bold text-ourArabGreen">Our Arab Heritage</span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/products" className={activeClass('/products')} aria-current={isActive('/products') ? 'page' : undefined}>Marketplace</Link>
            {user?.role === 'SELLER' && (
              <Link href="/sell" className={activeClass('/sell')} aria-current={isActive('/sell') ? 'page' : undefined}>Sell</Link>
            )}
            <Link
              href="/cart"
              className="relative flex items-center text-gray-600 hover:text-ourArabGreen transition focus:outline-none focus:ring-2 focus:ring-ourArabGreen rounded p-1"
              aria-label={cartItemCount > 0 ? `${cartItemCount} items in cart` : 'Your cart'}
            >
              <ShoppingCartIcon className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="ml-1 bg-ourArabGreen text-white rounded-full px-2 py-0.5 text-xs">
                  {cartItemCount}
                </span>
              )}
            </Link>
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="text-gray-600 hover:text-ourArabGreen focus:outline-none focus:ring-2 focus:ring-ourArabGreen rounded p-1"
                  aria-haspopup="true"
                  aria-expanded={isUserMenuOpen}
                  aria-label="User menu"
                  aria-controls="user-menu"
                >
                  <UserIcon className="h-6 w-6" />
                </button>
                {isUserMenuOpen && (
                  <div
                    id="user-menu"
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100"
                    role="menu"
                  >
                    <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" role="menuitem">Dashboard</Link>
                    {user.role === 'ADMIN' && (
                      <Link href="/admin" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" role="menuitem">Admin Panel</Link>
                    )}
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className={`w-full text-left px-4 py-2 ${
                        loggingOut ? 'text-gray-400 cursor-wait' : 'text-gray-700 hover:bg-gray-50 focus:bg-gray-50'
                      }`}
                      role="menuitem"
                    >
                      {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className={activeClass('/login')} aria-current={isActive('/login') ? 'page' : undefined}>Login</Link>
            )}
          </div>

          {/* Mobile Button */}
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="md:hidden text-gray-600 hover:text-ourArabGreen focus:outline-none focus:ring-2 focus:ring-ourArabGreen rounded p-1"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown */}
        <div
          ref={menuRef}
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
          aria-label="Mobile menu"
        >
          <div className="pb-2">
            <Link href="/products" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Marketplace</Link>
            {user?.role === 'SELLER' && (
              <Link href="/sell" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Sell</Link>
            )}
            <Link href="/cart" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Cart {cartItemCount > 0 && `(${cartItemCount})`}</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50"
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <Link href="/login" className="block px-4 py-2 text-gray-700 hover:bg-gray-50 focus:bg-gray-50" onClick={() => setIsMenuOpen(false)}>Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}



