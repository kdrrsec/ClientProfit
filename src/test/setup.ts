import "dotenv/config";

/**
 * Database tests run only against an explicitly configured test database
 * whose name contains "test", so they can never touch development data.
 */
const url = process.env.TEST_DATABASE_URL;
export const hasTestDatabase = Boolean(url && /\/[^/?]*test[^/?]*(\?|$)/.test(url));

if (hasTestDatabase) process.env.DATABASE_URL = url;
else delete process.env.DATABASE_URL;
