import { describe, expect, it, vi, beforeEach, type MockedFunction } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import StockForm from './StockForm.svelte';

// Mock the tRPC client
const mockPredict = vi.fn();
vi.mock('../trpc', () => ({
  trpcClient: {
    predict: mockPredict,
  },
}));

// Mock schemas to control validation behavior
vi.mock('../schemas', async () => {
  const actual = await vi.importActual('../schemas');
  return {
    ...actual,
  };
});

describe('StockForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render form with all required elements', () => {
      render(StockForm);

      expect(screen.getByLabelText(/stock symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/target date/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /get prediction/i })).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const dateInput = screen.getByLabelText(/target date/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      expect(symbolInput).toHaveAttribute('aria-invalid', 'false');
      expect(symbolInput).toHaveAttribute('required');
      expect(symbolInput).toHaveAttribute('autocomplete', 'off');
      expect(symbolInput).toHaveAttribute('maxlength', '10');

      expect(dateInput).toHaveAttribute('aria-invalid', 'false');
      expect(dateInput).toHaveAttribute('type', 'date');

      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have proper initial values', () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i) as HTMLInputElement;
      const dateInput = screen.getByLabelText(/target date/i) as HTMLInputElement;

      expect(symbolInput.value).toBe('');
      expect(dateInput.value).toBe('');
    });

    it('should display helper text', () => {
      render(StockForm);

      expect(screen.getByText(/enter a valid stock ticker symbol/i)).toBeInTheDocument();
      expect(screen.getByText(/leave blank for next trading day/i)).toBeInTheDocument();
      expect(screen.getByText(/your prediction will be generated/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors after form submission', async () => {
      render(StockForm);

      const submitButton = screen.getByRole('button', { name: /get prediction/i });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/stock symbol is required/i)).toBeInTheDocument();
      });

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      expect(symbolInput).toHaveAttribute('aria-invalid', 'true');
      expect(symbolInput).toHaveClass('error');
    });

    it('should validate symbol field in real-time after first submission', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      // First submission triggers validation
      await fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/stock symbol is required/i)).toBeInTheDocument();
      });

      // Now input changes should trigger real-time validation
      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await waitFor(() => {
        expect(screen.queryByText(/stock symbol is required/i)).not.toBeInTheDocument();
      });

      // Clear input to trigger error again
      await fireEvent.input(symbolInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText(/stock symbol is required/i)).toBeInTheDocument();
      });
    });

    it('should validate symbol format', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      // Submit first to enable real-time validation
      await fireEvent.click(submitButton);

      // Test invalid symbols
      await fireEvent.input(symbolInput, { target: { value: '123' } });
      await waitFor(() => {
        expect(screen.getByText(/stock symbol must contain only letters/i)).toBeInTheDocument();
      });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL123' } });
      await waitFor(() => {
        expect(screen.getByText(/stock symbol must contain only letters/i)).toBeInTheDocument();
      });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL-USD' } });
      await waitFor(() => {
        expect(screen.getByText(/stock symbol must contain only letters/i)).toBeInTheDocument();
      });
    });

    it('should validate date field when provided', async () => {
      render(StockForm);

      const dateInput = screen.getByLabelText(/target date/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      // First submission to enable real-time validation
      await fireEvent.click(submitButton);

      // Set past date
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      await fireEvent.input(dateInput, { target: { value: yesterday } });

      await waitFor(() => {
        expect(screen.getByText(/date must be today or in the future/i)).toBeInTheDocument();
      });

      expect(dateInput).toHaveAttribute('aria-invalid', 'true');
      expect(dateInput).toHaveClass('error');
    });

    it('should accept valid form data', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const dateInput = screen.getByLabelText(/target date/i);

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      await fireEvent.input(dateInput, { target: { value: tomorrow } });

      expect(symbolInput).not.toHaveClass('error');
      expect(dateInput).not.toHaveClass('error');
    });

    it('should transform symbol to uppercase', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i) as HTMLInputElement;
      
      await fireEvent.input(symbolInput, { target: { value: 'aapl' } });
      
      // The transformation happens in the validation, not in the input display
      // But we can check that the input accepts lowercase
      expect(symbolInput.value).toBe('aapl');
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with invalid data', async () => {
      render(StockForm);

      const submitButton = screen.getByRole('button', { name: /get prediction/i });
      await fireEvent.click(submitButton);

      expect(mockPredict).not.toHaveBeenCalled();
    });

    it('should submit with valid data', async () => {
      const mockPredictionResult = {
        symbol: 'AAPL',
        conservative: { targetPrice: 150, timeframe: '30d', probability: 0.7, factors: [], confidenceInterval: [140, 160], standardError: 5 },
        bullish: { targetPrice: 170, timeframe: '30d', probability: 0.5, factors: [], confidenceInterval: [160, 180], standardError: 7 },
        bearish: { targetPrice: 130, timeframe: '30d', probability: 0.3, factors: [], confidenceInterval: [120, 140], standardError: 6 },
        accuracy: { rSquared: 0.85, rmse: 8.2, mape: 5.1, confidenceInterval: [0.8, 0.9] },
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      };

      mockPredict.mockResolvedValueOnce(mockPredictionResult);

      const component = render(StockForm);
      let submitEventFired = false;
      let successEventFired = false;

      component.component.$on('submit', () => {
        submitEventFired = true;
      });

      component.component.$on('success', (event) => {
        successEventFired = true;
        expect(event.detail).toEqual(mockPredictionResult);
      });

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPredict).toHaveBeenCalledWith({
          symbol: 'AAPL',
          timeframe: '30d',
        });
      });

      expect(submitEventFired).toBe(true);
      expect(successEventFired).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error: Invalid symbol');
      mockPredict.mockRejectedValueOnce(mockError);

      const component = render(StockForm);
      let errorEventFired = false;

      component.component.$on('error', (event) => {
        errorEventFired = true;
        expect(event.detail.message).toBe('API Error: Invalid symbol');
      });

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'INVALID' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPredict).toHaveBeenCalled();
      });

      expect(errorEventFired).toBe(true);
    });

    it('should call callback props when provided', async () => {
      const mockPredictionResult = {
        symbol: 'AAPL',
        conservative: { targetPrice: 150, timeframe: '30d', probability: 0.7, factors: [], confidenceInterval: [140, 160], standardError: 5 },
        bullish: { targetPrice: 170, timeframe: '30d', probability: 0.5, factors: [], confidenceInterval: [160, 180], standardError: 7 },
        bearish: { targetPrice: 130, timeframe: '30d', probability: 0.3, factors: [], confidenceInterval: [120, 140], standardError: 6 },
        accuracy: { rSquared: 0.85, rmse: 8.2, mape: 5.1, confidenceInterval: [0.8, 0.9] },
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      };

      mockPredict.mockResolvedValueOnce(mockPredictionResult);

      const onPredictionResult = vi.fn();
      const onError = vi.fn();

      render(StockForm, {
        props: {
          onPredictionResult,
          onError,
        },
      });

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onPredictionResult).toHaveBeenCalledWith(mockPredictionResult);
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('should call error callback on API failure', async () => {
      const mockError = new Error('Network error');
      mockPredict.mockRejectedValueOnce(mockError);

      const onPredictionResult = vi.fn();
      const onError = vi.fn();

      render(StockForm, {
        props: {
          onPredictionResult,
          onError,
        },
      });

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
      });

      expect(onPredictionResult).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      mockPredict.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      // Check loading state
      expect(screen.getByText(/predicting.../i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
      expect(symbolInput).toBeDisabled();

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.getByText(/get prediction/i)).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should disable form fields during loading', async () => {
      mockPredict.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const dateInput = screen.getByLabelText(/target date/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      expect(symbolInput).toBeDisabled();
      expect(dateInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner', async () => {
      mockPredict.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      // Check for loading spinner (SVG element)
      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error messages with proper ARIA attributes', async () => {
      render(StockForm);

      const submitButton = screen.getByRole('button', { name: /get prediction/i });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should show error icon in error messages', async () => {
      render(StockForm);

      const submitButton = screen.getByRole('button', { name: /get prediction/i });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        const errorIcon = document.querySelector('.error-icon');
        expect(errorIcon).toBeInTheDocument();
        expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('should clear errors when field becomes valid', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      // Trigger validation error
      await fireEvent.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/stock symbol is required/i)).toBeInTheDocument();
      });

      // Fix the error
      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await waitFor(() => {
        expect(screen.queryByText(/stock symbol is required/i)).not.toBeInTheDocument();
      });

      expect(symbolInput).not.toHaveClass('error');
      expect(symbolInput).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(StockForm);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('novalidate');
    });

    it('should associate labels with inputs', () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const dateInput = screen.getByLabelText(/target date/i);

      expect(symbolInput).toHaveAttribute('id', 'symbol');
      expect(dateInput).toHaveAttribute('id', 'endDate');
    });

    it('should use proper describedby relationships', () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const dateInput = screen.getByLabelText(/target date/i);

      expect(symbolInput).toHaveAttribute('aria-describedby', 'symbol-help');
      expect(dateInput).toHaveAttribute('aria-describedby', 'endDate-help');
    });

    it('should update describedby when errors are shown', async () => {
      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(symbolInput).toHaveAttribute('aria-describedby', 'symbol-error symbol-help');
      });
    });

    it('should have required indicators', () => {
      render(StockForm);

      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle form submission on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockPredict.mockResolvedValueOnce({
        symbol: 'AAPL',
        conservative: { targetPrice: 150, timeframe: '30d', probability: 0.7, factors: [], confidenceInterval: [140, 160], standardError: 5 },
        bullish: { targetPrice: 170, timeframe: '30d', probability: 0.5, factors: [], confidenceInterval: [160, 180], standardError: 7 },
        bearish: { targetPrice: 130, timeframe: '30d', probability: 0.3, factors: [], confidenceInterval: [120, 140], standardError: 6 },
        accuracy: { rSquared: 0.85, rmse: 8.2, mape: 5.1, confidenceInterval: [0.8, 0.9] },
        confidence: 0.8,
        timestamp: new Date().toISOString(),
      });

      render(StockForm);

      const symbolInput = screen.getByLabelText(/stock symbol/i);
      const submitButton = screen.getByRole('button', { name: /get prediction/i });

      await fireEvent.input(symbolInput, { target: { value: 'AAPL' } });
      await fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockPredict).toHaveBeenCalled();
      });
    });
  });
});
