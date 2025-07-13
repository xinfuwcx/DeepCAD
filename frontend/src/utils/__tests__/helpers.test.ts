import { describe, it, expect } from 'vitest';
import { 
  shallowEqual, 
  deepEqual, 
  formatNumber, 
  formatFileSize, 
  uniqueArray, 
  groupBy,
  sortBy,
  pickKeys,
  omitKeys,
  hexToRgb,
  rgbToHex
} from '../helpers';

describe('shallowEqual', () => {
  it('returns true for identical primitives', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('test', 'test')).toBe(true);
    expect(shallowEqual(true, true)).toBe(true);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });
  
  it('returns false for different primitives', () => {
    expect(shallowEqual(1, 2)).toBe(false);
    expect(shallowEqual('test', 'other')).toBe(false);
    expect(shallowEqual(true, false)).toBe(false);
    expect(shallowEqual(null, undefined)).toBe(false);
  });
  
  it('returns true for shallow equal objects', () => {
    const obj1 = { a: 1, b: 'test', c: true };
    const obj2 = { a: 1, b: 'test', c: true };
    expect(shallowEqual(obj1, obj2)).toBe(true);
  });
  
  it('returns false for objects with different keys', () => {
    const obj1 = { a: 1, b: 'test' };
    const obj2 = { a: 1, c: 'test' };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
  
  it('returns false for objects with different values', () => {
    const obj1 = { a: 1, b: 'test' };
    const obj2 = { a: 2, b: 'test' };
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
  
  it('returns false for nested objects with same structure', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { c: 2 } };
    // shallowEqual doesn't compare nested objects by value
    expect(shallowEqual(obj1, obj2)).toBe(false);
  });
});

describe('deepEqual', () => {
  it('returns true for identical primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('test', 'test')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });
  
  it('returns false for different primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('test', 'other')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });
  
  it('returns true for shallow equal objects', () => {
    const obj1 = { a: 1, b: 'test', c: true };
    const obj2 = { a: 1, b: 'test', c: true };
    expect(deepEqual(obj1, obj2)).toBe(true);
  });
  
  it('returns true for deeply equal objects', () => {
    const obj1 = { a: 1, b: { c: 2, d: [1, 2, 3] } };
    const obj2 = { a: 1, b: { c: 2, d: [1, 2, 3] } };
    expect(deepEqual(obj1, obj2)).toBe(true);
  });
  
  it('returns false for objects with different nested values', () => {
    const obj1 = { a: 1, b: { c: 2, d: [1, 2, 3] } };
    const obj2 = { a: 1, b: { c: 2, d: [1, 2, 4] } };
    expect(deepEqual(obj1, obj2)).toBe(false);
  });
  
  it('returns false for objects with different structure', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { a: 1, b: { d: 2 } };
    expect(deepEqual(obj1, obj2)).toBe(false);
  });
  
  it('handles arrays correctly', () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, { a: 2 }], [1, { a: 2 }])).toBe(true);
  });
});

describe('formatNumber', () => {
  it('formats integers with default options', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(-1234)).toBe('-1,234');
  });
  
  it('formats decimals with specified precision', () => {
    expect(formatNumber(1234.5678, { decimals: 2 })).toBe('1,234.57');
    expect(formatNumber(1234.5, { decimals: 2 })).toBe('1,234.50');
    expect(formatNumber(0.1, { decimals: 3 })).toBe('0.100');
  });
  
  it('uses custom separators', () => {
    expect(formatNumber(1234.56, { 
      decimals: 2, 
      thousandsSeparator: '.', 
      decimalSeparator: ',' 
    })).toBe('1.234,56');
  });
  
  it('adds prefix and suffix', () => {
    expect(formatNumber(1234, { prefix: '$', suffix: ' USD' })).toBe('$1,234 USD');
    expect(formatNumber(99.9, { decimals: 1, prefix: '€' })).toBe('€99.9');
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(100)).toBe('100 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });
  
  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10240)).toBe('10 KB');
  });
  
  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(2097152)).toBe('2 MB');
  });
  
  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('uniqueArray', () => {
  it('removes duplicates from primitive arrays', () => {
    expect(uniqueArray([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    expect(uniqueArray(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    expect(uniqueArray([true, false, true])).toEqual([true, false]);
  });
  
  it('removes duplicates using key function', () => {
    const array = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Charlie' }
    ];
    
    expect(uniqueArray(array, item => item.id)).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ]);
  });
});

describe('groupBy', () => {
  it('groups array items by key', () => {
    const array = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'A', value: 3 },
      { category: 'C', value: 4 },
      { category: 'B', value: 5 }
    ];
    
    const result = groupBy(array, item => item.category);
    
    expect(result).toEqual({
      'A': [
        { category: 'A', value: 1 },
        { category: 'A', value: 3 }
      ],
      'B': [
        { category: 'B', value: 2 },
        { category: 'B', value: 5 }
      ],
      'C': [
        { category: 'C', value: 4 }
      ]
    });
  });
});

describe('sortBy', () => {
  it('sorts array in ascending order', () => {
    const array = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 35 }
    ];
    
    const result = sortBy(array, item => item.age);
    
    expect(result).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'Charlie', age: 30 },
      { name: 'Bob', age: 35 }
    ]);
  });
  
  it('sorts array in descending order', () => {
    const array = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 35 }
    ];
    
    const result = sortBy(array, item => item.age, 'desc');
    
    expect(result).toEqual([
      { name: 'Bob', age: 35 },
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 }
    ]);
  });
});

describe('pickKeys', () => {
  it('picks specified keys from object', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(pickKeys(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
  
  it('ignores keys that do not exist', () => {
    const obj = { a: 1, b: 2 };
    expect(pickKeys(obj, ['a', 'c' as any])).toEqual({ a: 1 });
  });
});

describe('omitKeys', () => {
  it('omits specified keys from object', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    expect(omitKeys(obj, ['a', 'c'])).toEqual({ b: 2, d: 4 });
  });
  
  it('ignores keys that do not exist', () => {
    const obj = { a: 1, b: 2 };
    expect(omitKeys(obj, ['a', 'c' as any])).toEqual({ b: 2 });
  });
});

describe('hexToRgb', () => {
  it('converts hex color to RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  
  it('returns null for invalid hex colors', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb('#gghhii')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('converts RGB to hex color', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });
  
  it('handles single-digit hex values', () => {
    expect(rgbToHex(10, 10, 10)).toBe('#0a0a0a');
  });
}); 