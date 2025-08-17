import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useState } from "react";
import * as React from "react";
import { clsx } from "clsx"; // Must be imported as a named export in strict ESM mode
import { Spinner } from "./Spinner.js"; // Must include `.js` extension

// === Styles ===
const BASE_STYLES =
  "inline-flex items-center justify-center rounded-md font-medium";
const FOCUS_STYLES =
  "focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900";
const TRANSITION_BASE = "transition-colors transition-shadow ease-in-out";
const DISABLED_STYLES = "disabled:cursor-not-allowed disabled:opacity-70";

const variantStyles = {
  primary:
    "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800",
  secondary:
    "bg-gray-100 hover:bg-gray-200 focus:ring-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600",
  danger:
    "bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800",
  outline:
    "border border-gray-300 hover:bg-gray-50 focus:ring-gray-400 dark:border-gray-600 dark:hover:bg-gray-700",
  ghost: "hover:bg-gray-100 focus:ring-gray-300 dark:hover:bg-gray-700",
} as const;

const textColors = {
  primary: "text-white",
  secondary: "text-gray-900 dark:text-gray-100",
  danger: "text-white",
  outline: "text-gray-700 dark:text-gray-200",
  ghost: "text-gray-700 dark:text-gray-200",
} as const;

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm md:px-4 md:py-2",
  md: "px-4 py-2 text-base md:px-6 md:py-3",
  lg: "px-6 py-3 text-lg md:px-8 md:py-4",
} as const;

const spinnerSizes = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const;

type ButtonVariant = keyof typeof variantStyles;
type ButtonSize = keyof typeof sizeStyles;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loader?: ReactNode;
  duration?: 100 | 150 | 200;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      loader,
      duration = 150,
      type = "button",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const isDisabled = disabled || loading;
    const hasChildren = !!children;

    useEffect(() => {
      if (typeof window === "undefined") return;
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches);
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    const spinnerColor = ["primary", "danger"].includes(variant)
      ? "white"
      : "currentColor";

    const buttonClassNames = clsx(
      BASE_STYLES,
      FOCUS_STYLES,
      TRANSITION_BASE,
      `duration-${duration}`,
      DISABLED_STYLES,
      variantStyles[variant],
      textColors[variant],
      sizeStyles[size],
      {
        "w-full": fullWidth,
        "cursor-wait": loading,
      },
      className
    );

    const renderLoader = () => (
      <div role="status" aria-live="polite">
        {loader || (
          <Spinner
            className={spinnerSizes[size]}
            color={spinnerColor}
            aria-label={hasChildren ? undefined : "Loading"}
            aria-hidden={hasChildren}
            style={{ animation: prefersReducedMotion ? "none" : undefined }}
          />
        )}
      </div>
    );

    const content = (
      <div
        className={clsx("flex items-center", {
          "gap-2": hasChildren && (leftIcon || rightIcon || loading),
          "gap-0": !hasChildren,
        })}
      >
        {loading && (
          <>
            {renderLoader()}
            {hasChildren && <span className="sr-only">Loading...</span>}
          </>
        )}
        {!loading && leftIcon && (
          <span className="inline-flex" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="inline-flex" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </div>
    );

    if (asChild) {
      try {
        if (!React.isValidElement(children)) {
          throw new Error(
            "Button: 'asChild' requires a valid React element as its only child"
          );
        }

        return React.cloneElement(children, {
          ...children.props,
          className: clsx(buttonClassNames, children.props.className),
          disabled: isDisabled,
          "aria-disabled": isDisabled,
          "aria-busy": loading,
          ref,
        });
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={buttonClassNames}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
