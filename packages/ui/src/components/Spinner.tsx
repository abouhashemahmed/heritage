import type { CSSProperties, SVGProps } from "react";
import { forwardRef, memo } from "react";
import { clsx } from "clsx"; // Use named import for ESM

export type SpinnerProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  label?: string;
  className?: string;
  style?: CSSProperties;
} & SVGProps<SVGSVGElement>;

export const Spinner = memo(
  forwardRef<SVGSVGElement, SpinnerProps>(
    (
      {
        size = 24,
        color = "currentColor",
        strokeWidth = 4,
        label = "Loading...",
        className,
        style,
        ...svgProps
      },
      ref
    ) => (
      <div
        role="status"
        aria-live="polite"
        aria-label={label}
        className={clsx("inline-block", className)}
      >
        <svg
          {...svgProps}
          ref={ref}
          className={clsx("animate-spin", className)}
          style={{
            width: size,
            height: size,
            color,
            ...style,
          }}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          data-testid="spinner-svg"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="opacity-25"
          />
          <path
            fill="currentColor"
            className="opacity-75"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )
  )
);

Spinner.displayName = "Spinner";
