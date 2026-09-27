import type { Messages, MessageKey } from "./messages/en";

export type TParams = Record<string, string | number>;
export type T = (key: MessageKey, params?: TParams) => string;

/** Creates a translate function. Placeholders look like {name}. Unknown keys fall back to the key itself. */
export function createT(messages: Messages): T {
  return (key, params) => {
    const template = messages[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
  };
}

export function isMessageKey(messages: Messages, key: string): key is MessageKey {
  return Object.prototype.hasOwnProperty.call(messages, key);
}

const PARAMS_SEP = "\u001f";

/**
 * Encodes a message key (plus optional params) as a plain string, so server
 * actions and validation schemas can return language-neutral messages that
 * the UI translates when rendering.
 */
export function msg(key: MessageKey, params?: TParams): string {
  return params ? `${key}${PARAMS_SEP}${JSON.stringify(params)}` : key;
}

/** True when the value was made by msg() with a known key. */
export function isMessage(messages: Messages, value: string): boolean {
  return isMessageKey(messages, value.split(PARAMS_SEP)[0] ?? "");
}

/** Translates a string made by msg(). Anything else is returned unchanged. */
export function translateMessage(messages: Messages, t: T, value: string): string {
  const [key = "", raw] = value.split(PARAMS_SEP);
  if (!isMessageKey(messages, key)) return value;
  let params: TParams | undefined;
  try {
    params = raw ? (JSON.parse(raw) as TParams) : undefined;
  } catch {
    params = undefined;
  }
  return t(key, params);
}
