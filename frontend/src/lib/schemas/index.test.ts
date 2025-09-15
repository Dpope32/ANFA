import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  stockSymbolSchema,
  futureDateSchema,
  optionalDateSchema,
  stockFormSchema,
  predictionRequestSchema,
  validateStockForm,
  getFormErrors,
  type StockFormData,
} from './index';

describe('Zod Schemas', () => {
  describe('stockSymbolSchema', () => {
    it('should accept valid stock symbols', () => {
      expect(stockSymbolSchema.parse('AAPL')).toBe('AAPL');
      expect(stockSymbolSchema.parse('TSLA')).toBe('TSLA');
      expect(stockSymbolSchema.parse('MSFT')).toBe('MSFT');
      expect(stockSymbolSchema.parse('GOOGL')).toBe('GOOGL');
    });

    it('should transform lowercase to uppercase', () => {
      expect(stockSymbolSchema.parse('aapl')).toBe('AAPL');
      expect(stockSymbolSchema.parse('tsla')).toBe('TSLA');
      expect(stockSymbolSchema.parse('mixed')).toBe('MIXED');
    });

    it('should handle mixed case symbols', () => {
      expect(stockSymbolSchema.parse('AaPl')).toBe('AAPL');
      expect(stockSymbolSchema.parse('TsLa')).toBe('TSLA');
    });

    it('should reject empty strings', () => {
      expect(() => stockSymbolSchema.parse('')).toThrow('Stock symbol is required');
    });

    it('should reject symbols longer than 10 characters', () => {
      expect(() => stockSymbolSchema.parse('VERYLONGSYMBOL')).toThrow(
        'Stock symbol must be 10 characters or less'
      );
    });

    it('should reject symbols with numbers', () => {
      expect(() => stockSymbolSchema.parse('AAPL1')).toThrow(
        'Stock symbol must contain only letters'
      );
      expect(() => stockSymbolSchema.parse('123')).toThrow(
        'Stock symbol must contain only letters'
      );
    });

    it('should reject symbols with special characters', () => {
      expect(() => stockSymbolSchema.parse('AAPL-')).toThrow(
        'Stock symbol must contain only letters'
      );
      expect(() => stockSymbolSchema.parse('AAPL.')).toThrow(
        'Stock symbol must contain only letters'
      );
      expect(() => stockSymbolSchema.parse('AAPL_')).toThrow(
        'Stock symbol must contain only letters'
      );
    });

    it('should reject whitespace-only strings', () => {
      expect(() => stockSymbolSchema.parse(' ')).toThrow(
        'Stock symbol must contain only letters'
      );
      expect(() => stockSymbolSchema.parse('   ')).toThrow(
        'Stock symbol must contain only letters'
      );
    });
  });

  describe('futureDateSchema', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    it('should accept today\'s date', () => {
      expect(() => futureDateSchema.parse(today)).not.toThrow();
    });

    it('should accept future dates', () => {
      expect(() => futureDateSchema.parse(tomorrow)).not.toThrow();
      expect(() => futureDateSchema.parse('2030-12-31')).not.toThrow();
    });

    it('should reject past dates', () => {
      expect(() => futureDateSchema.parse(yesterday)).toThrow(
        'Date must be today or in the future'
      );
      expect(() => futureDateSchema.parse('2020-01-01')).toThrow(
        'Date must be today or in the future'
      );
    });

    it('should reject empty strings', () => {
      expect(() => futureDateSchema.parse('')).toThrow('Date is required');
    });

    it('should reject invalid date formats', () => {
      expect(() => futureDateSchema.parse('invalid-date')).toThrow('Invalid date format');
      expect(() => futureDateSchema.parse('2024-13-01')).toThrow('Invalid date format');
      expect(() => futureDateSchema.parse('2024-01-32')).toThrow('Invalid date format');
    });
  });

  describe('optionalDateSchema', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    it('should accept undefined', () => {
      expect(() => optionalDateSchema.parse(undefined)).not.toThrow();
    });

    it('should accept empty strings', () => {
      expect(() => optionalDateSchema.parse('')).not.toThrow();
      expect(() => optionalDateSchema.parse('   ')).not.toThrow();
    });

    it('should accept valid future dates', () => {
      expect(() => optionalDateSchema.parse(today)).not.toThrow();
      expect(() => optionalDateSchema.parse(tomorrow)).not.toThrow();
    });

    it('should reject past dates when provided', () => {
      expect(() => optionalDateSchema.parse(yesterday)).toThrow(
        'Date must be today or in the future'
      );
    });

    it('should reject invalid date formats when provided', () => {
      expect(() => optionalDateSchema.parse('invalid-date')).toThrow('Invalid date format');
    });
  });

  describe('stockFormSchema', () => {
    const validFormData: StockFormData = {
      symbol: 'AAPL',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    it('should accept valid form data', () => {
      const result = stockFormSchema.parse(validFormData);
      expect(result.symbol).toBe('AAPL');
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-12-31');
    });

    it('should accept form data with empty endDate', () => {
      const formData = { ...validFormData, endDate: '' };
      expect(() => stockFormSchema.parse(formData)).not.toThrow();
    });

    it('should accept form data without endDate', () => {
      const formData = { ...validFormData };
      delete formData.endDate;
      expect(() => stockFormSchema.parse(formData)).not.toThrow();
    });

    it('should transform symbol to uppercase', () => {
      const formData = { ...validFormData, symbol: 'aapl' };
      const result = stockFormSchema.parse(formData);
      expect(result.symbol).toBe('AAPL');
    });

    it('should reject invalid symbols', () => {
      const formData = { ...validFormData, symbol: '' };
      expect(() => stockFormSchema.parse(formData)).toThrow();
    });

    it('should reject past dates in endDate', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const formData = { ...validFormData, endDate: yesterday };
      expect(() => stockFormSchema.parse(formData)).toThrow();
    });
  });

  describe('predictionRequestSchema', () => {
    it('should accept valid prediction requests', () => {
      const request = { symbol: 'AAPL', timeframe: '30d' as const };
      const result = predictionRequestSchema.parse(request);
      expect(result.symbol).toBe('AAPL');
      expect(result.timeframe).toBe('30d');
    });

    it('should use default timeframe when not provided', () => {
      const request = { symbol: 'AAPL' };
      const result = predictionRequestSchema.parse(request);
      expect(result.timeframe).toBe('30d');
    });

    it('should accept valid timeframes', () => {
      const timeframes = ['7d', '14d', '30d', '60d', '90d'] as const;
      for (const timeframe of timeframes) {
        const request = { symbol: 'AAPL', timeframe };
        expect(() => predictionRequestSchema.parse(request)).not.toThrow();
      }
    });

    it('should reject invalid timeframes', () => {
      const request = { symbol: 'AAPL', timeframe: '1d' };
      expect(() => predictionRequestSchema.parse(request)).toThrow();
    });
  });

  describe('getFormErrors', () => {
    it('should convert Zod errors to form validation errors', () => {
      const zodError = new z.ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Stock symbol is required',
          path: ['symbol'],
        },
        {
          code: 'custom',
          message: 'Date must be today or in the future',
          path: ['endDate'],
        },
      ]);

      const errors = getFormErrors(zodError);
      expect(errors.symbol).toEqual(['Stock symbol is required']);
      expect(errors.endDate).toEqual(['Date must be today or in the future']);
    });

    it('should handle multiple errors for the same field', () => {
      const zodError = new z.ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'First error',
          path: ['symbol'],
        },
        {
          code: 'custom',
          message: 'Second error',
          path: ['symbol'],
        },
      ]);

      const errors = getFormErrors(zodError);
      expect(errors.symbol).toEqual(['First error', 'Second error']);
    });
  });

  describe('validateStockForm', () => {
    const validData: StockFormData = {
      symbol: 'AAPL',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    it('should return success for valid data', () => {
      const result = validateStockForm(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        symbol: 'AAPL',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const invalidData = { ...validData, symbol: '' };
      const result = validateStockForm(invalidData);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors?.symbol).toContain('Stock symbol is required');
    });

    it('should transform data on successful validation', () => {
      const dataWithLowercaseSymbol = { ...validData, symbol: 'aapl' };
      const result = validateStockForm(dataWithLowercaseSymbol);
      expect(result.success).toBe(true);
      expect(result.data?.symbol).toBe('AAPL');
    });

    it('should handle completely invalid input', () => {
      const result = validateStockForm(null);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should re-throw non-Zod errors', () => {
      // Mock a non-Zod error by providing invalid schema
      expect(() => validateStockForm(Symbol('test'))).toThrow();
    });
  });
});
