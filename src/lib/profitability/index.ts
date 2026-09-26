/**
 * ClientProfit profitability engine.
 *
 * The single place where revenue, costs, labour, profit and margin are
 * calculated. Pure functions, no I/O: callers load records (organization
 * scoped) and pass them in. UI components must never do financial math.
 */
export * from "./money";
export * from "./intervals";
export * from "./dates";
export * from "./lines";
export * from "./recurring";
export * from "./status";
export * from "./client";
export * from "./portfolio";
export * from "./timeline";
