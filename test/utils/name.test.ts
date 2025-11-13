import { describe, it, expect } from 'vitest';
import { validVarName, validTagName } from '../../src/utils/name';

describe('validVarName', () => {
    it('should accept valid variable names', () => {
        expect(validVarName('myVar')).toBe(true);
        expect(validVarName('MyVar')).toBe(true);
        expect(validVarName('my_var')).toBe(true);
        expect(validVarName('myVar123')).toBe(true);
        expect(validVarName('a')).toBe(true);
    });

    it('should reject invalid variable names', () => {
        expect(validVarName('123var')).toBe(false);
        expect(validVarName('my-var')).toBe(false);
        expect(validVarName('my var')).toBe(false);
        expect(validVarName('my.var')).toBe(false);
        expect(validVarName('')).toBe(false);
    });
});

describe('validTagName', () => {
    it('should accept valid tag names starting with uppercase', () => {
        expect(validTagName('MyComponent')).toBe(true);
        expect(validTagName('A')).toBe(true);
        expect(validTagName('MyComponent123')).toBe(true);
        expect(validTagName('My_Component')).toBe(true);
    });

    it('should reject tag names not starting with uppercase', () => {
        expect(validTagName('myComponent')).toBe(false);
        expect(validTagName('a')).toBe(false);
    });

    it('should reject invalid tag names', () => {
        expect(validTagName('My-Component')).toBe(false);
        expect(validTagName('My Component')).toBe(false);
        expect(validTagName('123Component')).toBe(false);
        expect(validTagName('')).toBe(false);
    });
});
