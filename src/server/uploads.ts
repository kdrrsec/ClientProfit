import "server-only";

/** Logo uploads go to Vercel Blob; only available when BLOB_READ_WRITE_TOKEN is configured. */
export function uploadsEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
