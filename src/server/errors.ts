import { msg } from "@/i18n/translate";

/**
 * Thrown when a record does not exist *in the caller's organization*. Never reveals whether it exists elsewhere.
 * The message is a translatable key; `what` is kept for logs and debugging.
 */
export class NotFoundError extends Error {
  constructor(readonly what = "Record") {
    super(msg("err.notFound"));
    this.name = "NotFoundError";
  }
}

export function assertAffected(result: { count: number }, what: string) {
  if (result.count === 0) throw new NotFoundError(what);
}
