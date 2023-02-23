export const toTime = (date: Date): number => {
  return date.getTime();
};

export const fromTime = (date: number): Date => {
  return new Date(date);
};

