// Simple logging utility for server-side logging
// In production, this could be extended to use a proper logging service

export const logger = {
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : '');
  },
  
  warn: (message: string, details?: any) => {
    console.warn(`[WARN] ${message}`, details ? details : '');
  },
  
  info: (message: string, details?: any) => {
    console.log(`[INFO] ${message}`, details ? details : '');
  },
  
  debug: (message: string, details?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, details ? details : '');
    }
  }
};
