export const stringify = (
  target: Record<string, string | number | null | undefined>,
  {
    keyValueDelimiter = ':',
    objectsDelimiter = ',',
  }: { keyValueDelimiter?: string; objectsDelimiter?: string } = {},
): string => {
  const keys = Object.keys(target);
  if (keys.length < 1) return '';
  return keys
    .sort()
    .reduce((acc, key) => {
      const value = target[key];
      if (value) {
        acc.push(`${key}${keyValueDelimiter}${value}`);
      }
      return acc;
    }, [] as string[])
    .join(objectsDelimiter);
};
