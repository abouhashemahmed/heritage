// components/ProductActions.js
'use client';

import { useState, useEffect, useRef } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { useTransition, animated } from "@react-spring/web";
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/react-dom";

export default function ProductActions({ product, onEdit, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const menuId = `product-action-menu-${product.id}`;

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(6), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const transitions = useTransition(isOpen, {
    from: { opacity: 0, transform: "scale(0.95)" },
    enter: { opacity: 1, transform: "scale(1.02)" },
    leave: { opacity: 0, transform: "scale(0.95)" },
    config: { tension: 250, friction: 22 },
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !refs.reference.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [refs.reference]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") setIsOpen(false);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className="relative z-10" ref={refs.setReference}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Actions for ${product.title}`}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-heritageGold"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </button>

      {transitions(
        (style, item) =>
          item && (
            <animated.div
              ref={refs.setFloating}
              id={menuId}
              style={{ ...style, ...floatingStyles, minWidth: "12rem" }}
              className="absolute mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg"
              role="menu"
              aria-label="Product action menu"
            >
              <div ref={menuRef} className="py-1">
                <button
                  type="button"
                  onClick={onEdit}
                  role="menuitem"
                  tabIndex={isOpen ? 0 : -1}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  role="menuitem"
                  tabIndex={isOpen ? 0 : -1}
                  className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:bg-red-50 dark:focus:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            </animated.div>
          )
      )}
    </div>
  );
}


