// components/ListingSkeleton.js
import PropTypes from "prop-types";

export default function ListingSkeleton({ count = 3 }) {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

ListingSkeleton.propTypes = {
  count: PropTypes.number,
};
