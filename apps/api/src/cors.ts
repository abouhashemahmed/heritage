// apps/api/src/cors.ts
import cors from 'cors';
import { getConfig } from './config.js';

const config = getConfig();

const whitelist = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-production-frontend.com', // replace this
  `https://${config.apiDomain}`
];

export default cors({
  origin: (origin, callback) => {
    // Allow server-to-server or tools like Postman (no origin)
    if (!origin) return callback(null, true);

    // Allow whitelisted origins
    if (whitelist.includes(origin)) {
      return callback(null, true);
    }

    // Otherwise reject
    callback(new Error(`❌ CORS blocked: ${origin}`));
  },
  credentials: true, // Allow cookies/headers to be sent
  optionsSuccessStatus: 200, // For legacy browsers
});
