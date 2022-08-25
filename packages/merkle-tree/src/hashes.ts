import { createHash } from 'crypto';
import { MerkleTree as MT } from 'merkletreejs';

export type TransformFn = (key: string, value: string | number) => string

export type Target = Record<string, string | number | null | undefined>

export interface Config {
  keyPairs?: string[][]
  transformFn?: TransformFn
  keyPairsDivider?: string
}

export const hash = (thingToHash: string): string => {
  return createHash('SHA256').update(thingToHash).digest('hex');
};

export const defaultTransformFn = (key: string, value: string | number) =>
  `${key}:${value}`;

export class MerkleTree {
  private keyPairs: string[][];
  private keyPairsDivider: string;
  private transformFn: TransformFn;

  constructor({ keyPairs, keyPairsDivider, transformFn }: Config) {
    this.keyPairs = keyPairs ?? [];
    this.keyPairsDivider = keyPairsDivider ?? '+';
    this.transformFn = transformFn ?? defaultTransformFn;
  }

  createMerkleTree = (leaves: string[]) => {
    const tree = new MT(leaves, hash);

    return {
      verify: (leaf: string) =>
        tree.verify(tree.getProof(leaf), leaf, tree.getRoot()),
      tree,
    };
  };

  createVerifiableObjectHash(target: Target) {
    const result = Object.keys(target)
      .sort()
      .reduce((acc, key) => {
        const value = target[key];
        if (value) {
          acc.push(this.transformFn(key, value));
        }
        return acc;
      }, [] as string[]);
    if (result.length < 1) {
      return null;
    }
    return hash(result.join(this.keyPairsDivider));
  }

  transformObjectToHashedLeaves = (target: Target) => {
    const leaves = Object.keys(target)
      .sort()
      .reduce((acc, key) => {
        const value = target[key];
        if (value) {
          acc.push(this.transformFn(key, value));
        }
        return acc;
      }, [] as string[]);

    const pairs = this.keyPairs.reduce((result, pair) => {
      const verifiableObject = pair.reduce((acc, key) => {
        const value = target[key];
        if (value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Target);

      const leaf = this.createVerifiableObjectHash(verifiableObject);
      if (leaf) {
        result.push(leaf);
      }
      return result;
    }, []);
    return [...leaves, ...pairs].map(hash);
  };
}
