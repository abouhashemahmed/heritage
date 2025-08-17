import { useEffect, useState, useMemo } from "react";
import PropTypes from "prop-types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/router";
import pathToRegexp from "path-to-regexp";
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Higher-order component for protecting routes with advanced authentication and authorization
 */
function withAuth(Component, options = {}) {
  const {
    redirectPath = "/login",
    unauthorizedPath = "/unauthorized",
    roleRestrictions = [],
    publicRoutes = [],
    onUnauthorized = null,
  } = options;

  function ProtectedRoute(props) {
    const { user, loading, error } = useAuth();
    const router = useRouter();

    const [hasMounted, setHasMounted] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [showTimeout, setShowTimeout] = useState(false);

    const isPublicRoute = useMemo(() => {
      return publicRoutes.some((route) => {
        try {
          const regex = pathToRegexp(route);
          return regex.test(router.pathname);
        } catch {
          return route === router.pathname;
        }
      });
    }, [publicRoutes, router.pathname]);

    const hasRequiredRole = useMemo(() => {
      if (!user?.roles?.length) return false;
      return roleRestrictions.some((role) => user.roles.includes(role));
    }, [user?.roles, roleRestrictions]);

    useEffect(() => {
      setHasMounted(true);
      return () => setHasMounted(false);
    }, []);

    useEffect(() => {
      const timeout = setTimeout(() => {
        if (!isAuthorized && hasMounted) setShowTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    }, [isAuthorized, hasMounted]);

    useEffect(() => {
      if (!hasMounted || loading) return;

      if (isPublicRoute) {
        setIsAuthorized(true);
        return;
      }

      if (!user) {
        const query = router.asPath === "/" ? {} : { from: router.asPath };
        router.replace({ pathname: redirectPath, query });
        return;
      }

      if (roleRestrictions.length && !hasRequiredRole) {
        onUnauthorized?.(user, router.pathname);
        router.replace(unauthorizedPath);
        return;
      }

      setIsAuthorized(true);
    }, [
      hasMounted,
      loading,
      user,
      isPublicRoute,
      hasRequiredRole,
      router,
      redirectPath,
      unauthorizedPath,
      roleRestrictions,
      onUnauthorized,
    ]);

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
          <p className="text-red-500 text-lg mb-4">
            🔒 Authentication check failed. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            aria-label="Retry authentication check"
          >
            Retry Now
          </button>
        </div>
      );
    }

    if (loading || (!isAuthorized && !isPublicRoute)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
          <LoadingSpinner text="Securing your access..." />
          {showTimeout && (
            <div className="mt-4 text-orange-500">
              <p>⚠️ This is taking longer than expected...</p>
              <button
                onClick={() => router.reload()}
                className="mt-2 text-orange-600 hover:text-orange-700 underline"
                aria-label="Refresh page"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      );
    }

    return <Component {...props} />;
  }

  ProtectedRoute.displayName = `WithAuth(${Component.displayName || Component.name || "Component"})`;

  ProtectedRoute.propTypes = {
    props: PropTypes.object,
  };

  return ProtectedRoute;
}

// Static prop validation for the HOC factory
withAuth.propTypes = {
  Component: PropTypes.elementType.isRequired,
  options: PropTypes.shape({
    publicRoutes: PropTypes.arrayOf(PropTypes.string),
    roleRestrictions: PropTypes.arrayOf(PropTypes.string),
    redirectPath: PropTypes.string,
    unauthorizedPath: PropTypes.string,
    onUnauthorized: PropTypes.func,
  }),
};

export default withAuth;
