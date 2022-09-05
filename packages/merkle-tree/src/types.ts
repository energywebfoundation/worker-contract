export interface Target {
  [k: string]: string | number | boolean | null | undefined | Date | Target | Target[] | string[] | number[] | boolean[] | Date[]
}

