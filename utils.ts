
export const generateId = (): string => {
  // Fallback seguro para navegadores que não suportam crypto.randomUUID ou contexto inseguro
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback silencioso
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};
