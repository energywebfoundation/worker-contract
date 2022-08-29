import { stringify } from '../src';

describe('Stringify', () => {
  it('should stringify simple object and sort keys', () => {
    const obj = {
      name: 'object',
      id: 1,
    };
    const s = stringify(obj);
    expect(s === '{"id":1,"name":"object"}').toBe(true);
  });
  it('should omit values other then string, number and nested objects with these values', () => {
    const obj = {
      name: 'object',
      id: 1,
      bark: () => {
        console.log('Woof woof');
      },
      empty: null,
    };
    const s = stringify(obj as any);
    expect(s === '{"id":1,"name":"object"}').toBe(true);
  });
  it('should stringify nested objects', () => {
    const obj = {
      id: 1,
      name: 'object',
      props: {
        value: 10,
        bad: false,
        nested: {
          fine: true,
          a: 1,
        },
      },
    };
    const s = stringify(obj);
    expect(s === '{"id":1,"name":"object","props":{"bad":false,"nested":{"a":1,"fine":true},"value":10}}').toBe(true);
  });
});
