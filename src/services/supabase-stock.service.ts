/**
 * Supabase Stock Data Service
 * Connects to your Supabase instance for real Tesla stock data
 */

import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase dashboard
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface TeslaStockData {
  id?: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted_close?: number;
  created_at?: string;
}

export interface StockPricePoint {
  date: string;
  price: number;
  volume: number;
  change?: number;
  percentChange?: number;
}

export class SupabaseStockService {
  /**
   * Get latest Tesla stock price
   */
  static async getLatestPrice(): Promise<TeslaStockData | null> {
    const { data, error } = await supabase
      .from('tesla_stock_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest price:', error);
      return null;
    }

    return data;
  }

  /**
   * Get Tesla stock data for a date range
   */
  static async getHistoricalData(
    startDate?: string,
    endDate?: string,
    limit = 30
  ): Promise<TeslaStockData[]> {
    let query = supabase
      .from('tesla_stock_data')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get price data for charting
   */
  static async getChartData(days = 30): Promise<StockPricePoint[]> {
    const { data, error } = await supabase
      .from('tesla_stock_data')
      .select('date, close, volume')
      .order('date', { ascending: true })
      .limit(days);

    if (error) {
      console.error('Error fetching chart data:', error);
      return [];
    }

    // Calculate daily changes
    const chartData: StockPricePoint[] = [];
    let previousClose = 0;

    for (const point of data || []) {
      const change = previousClose ? point.close - previousClose : 0;
      const percentChange = previousClose ? (change / previousClose) * 100 : 0;

      chartData.push({
        date: point.date,
        price: point.close,
        volume: point.volume,
        change: Number(change.toFixed(2)),
        percentChange: Number(percentChange.toFixed(2))
      });

      previousClose = point.close;
    }

    return chartData;
  }

  /**
   * Get stock statistics
   */
  static async getStats() {
    const data = await this.getHistoricalData(undefined, undefined, 30);
    
    if (!data.length) return null;

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    const latest = data[0];
    const oldest = data[data.length - 1];
    
    return {
      current: latest.close,
      high30d: Math.max(...prices),
      low30d: Math.min(...prices),
      avg30d: prices.reduce((a, b) => a + b, 0) / prices.length,
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      change30d: latest.close - oldest.close,
      changePercent30d: ((latest.close - oldest.close) / oldest.close) * 100,
      lastUpdate: latest.date
    };
  }

  /**
   * Add new stock data (for updates)
   */
  static async addStockData(data: Omit<TeslaStockData, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('tesla_stock_data')
      .insert(data);

    if (error) {
      console.error('Error adding stock data:', error);
      return false;
    }

    return true;
  }

  /**
   * Bulk insert stock data
   */
  static async bulkInsertData(
    data: Omit<TeslaStockData, 'id' | 'created_at'>[],
    batchSize = 10
  ): Promise<number> {
    let inserted = 0;

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('tesla_stock_data')
        .upsert(batch, { 
          onConflict: 'date',
          ignoreDuplicates: true 
        });

      if (!error) {
        inserted += batch.length;
      } else {
        console.error(`Error inserting batch ${i / batchSize}:`, error);
      }
    }

    return inserted;
  }

  /**
   * Subscribe to real-time updates
   */
  static subscribeToUpdates(callback: (data: TeslaStockData) => void) {
    return supabase
      .channel('tesla-stock-updates')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'tesla_stock_data' 
        },
        (payload) => {
          callback(payload.new as TeslaStockData);
        }
      )
      .subscribe();
  }
}

// Export for direct use
export default SupabaseStockService;
