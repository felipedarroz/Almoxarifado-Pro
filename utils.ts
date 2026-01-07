
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

export const parseDate = (dateStr: string | undefined): Date | null => {
  if (!dateStr) return null;

  // Se já for ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }

  // Se for formato BR (DD/MM/YYYY)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return new Date(`${year}-${month}-${day}T00:00:00`);
  }

  // Tenta parse genérico
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const formatDate = (dateStr: string | undefined): string => {
  const date = parseDate(dateStr);
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR');
};

export const getDaysDiff = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
