export interface PIIStore {
  [token: string]: string;
}

export const PII_REGEX = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  // Heuristic US-style street address: number + street name + "St" or "Street".
  ADDRESS: /\b\d{1,5}\s+[A-Za-z0-9.'-]+\s+(Street|St)\b[^\n\r]*/g,
};

/** Non-global regexes for one-off .test() checks. Using PII_REGEX.EMAIL.test() repeatedly can give wrong results due to lastIndex. */
const PII_TEST = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
  ADDRESS: /\b\d{1,5}\s+[A-Za-z0-9.'-]+\s+(Street|St)\b/,
};

/**
 * Returns true if the string contains PII (email, phone, or address). Safe to call repeatedly (does not mutate regex state).
 */
export function containsPii(text: string): boolean {
  return (
    PII_TEST.EMAIL.test(text) ||
    PII_TEST.PHONE.test(text) ||
    PII_TEST.ADDRESS.test(text)
  );
}
  
  /**
   * Dehydrates a string by replacing PII with tokens.
   * Returns the dehydrated text and the map for rehydration.
   */
export function dehydrate(text: string): {
  dehydrated: string;
  store: PIIStore;
} {
  const store: PIIStore = {};
  let counter = 0;

  let dehydrated = text.replace(PII_REGEX.EMAIL, (match) => {
    const token = `{{PII_EMAIL_${counter++}}}`;
    store[token] = match;
    return token;
  });

  dehydrated = dehydrated.replace(PII_REGEX.PHONE, (match) => {
    const token = `{{PII_PHONE_${counter++}}}`;
    store[token] = match;
    return token;
  });

  dehydrated = dehydrated.replace(PII_REGEX.ADDRESS, (match) => {
    const token = `{{PII_ADDR_${counter++}}}`;
    store[token] = match;
    return token;
  });

  return { dehydrated, store };
}
  
  /**
   * Rehydrates tokens back into their original PII values.
   */
  export function rehydrate(text: string, store: PIIStore): string {
    let rehydrated = text;
    for (const [token, value] of Object.entries(store)) {
      rehydrated = rehydrated.replace(token, value);
    }
    return rehydrated;
  }