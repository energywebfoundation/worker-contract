export const sortArray = <T>(target: NonNullable<T>[]): T[] => {
  const preparedArray = target.map(item => {
    if (typeof item === 'object') {
      return JSON.stringify(sortObject(item));
    }
    return JSON.stringify(item);
  }).sort();
  return preparedArray.map(item => {
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  });
};

export const sortObject = <T extends Record<string, any>>(target: T): T => {
  const keys = Object.keys(target);
  if (keys.length < 1) return target;

  keys.sort();

  return keys
    .reduce((acc, key) => {
      const value = target[key];
      if (value || typeof value === 'boolean') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          acc[key] = sortObject(value);
          return acc;
        }

        if (Array.isArray(value)) {
          acc[key] = sortArray(value);
          return acc;
        }
        acc[key] = value;
        return acc;
      }
      return acc;
    }, {} as any);
};
