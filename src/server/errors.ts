/** Thrown when a record does not exist *in the caller's organization*. Never reveals whether it exists elsewhere. */
export class NotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

export function assertAffected(result: { count: number }, what: string) {
  if (result.count === 0) throw new NotFoundError(what);
}
