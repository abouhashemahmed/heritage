/**
 * Augments Express types with custom interfaces for:
 * - Security token binding
 * - Authenticated user data
 * - Session management
 */
import "express";

declare global {
  namespace Express {
    /**
     * Security token binding data for session validation
     */
    interface TokenBinding {
      ip: string;          // Client's originating IP
      uaHash: string;      // Hashed User-Agent (format: 'algo:hash')
      userAgent: string;   // Raw User-Agent header
    }

    /**
     * Authenticated user entity
     */
    interface User {
      id: string;                         // Unique user identifier
      email: string;                      // Verified email address
      role: "admin" | "user" | "guest";   // Access role
    }

    /**
     * Session metadata
     */
    interface Session {
      id: string;        // Session UUID (v4 format)
      expiresAt: Date;   // Absolute expiration time
    }

    /**
     * Augmented Express Request object
     */
    interface Request {
      /**
       * Client binding data for security validation
       */
      tokenBinding?: TokenBinding;
      
      /**
       * Authenticated user payload
       */
      user?: User;
      
      /**
       * Session information
       */
      session?: Session;

      // Catch-all for middleware extensions
      [key: string]: any;
    }
  }
}

// Ensure module isolation
export {};