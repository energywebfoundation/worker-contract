export interface Target {
  [k: string]: string | number | boolean | null | undefined | Target | Target[] | string[] | number[] | boolean[]
}

