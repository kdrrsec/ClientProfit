/**
 * A group of messages in both languages. The Dutch object must have exactly
 * the same keys as the English one, so a missing translation is a type error.
 */
export function part<K extends string>(p: { en: Record<K, string>; nl: Record<NoInfer<K>, string> }) {
  return p;
}
