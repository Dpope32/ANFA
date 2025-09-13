/**
 * Polygon Options Data Service
 * Fetches real options chain data from Polygon.io
 */

import axios from 'axios';
import { CacheService } from '../../services/cache';

export class PolygonOptionsService {
  private cache: CacheService;
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.cache = new CacheService();
    this.baseUrl = process.env.POLYGON_BASE_URL || 'https://api.polygon.io';
    this.apiKey = process.env.POLYGON_API_KEY || '';
  }

  /**
   * Get options chain from Polygon
   */
  async getOptionsChain(symbol: string, expiration?: string): Promise<any> {
    const cacheKey = `polygon:options:${symbol}:${expiration || 'all'}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get current price first
      const priceResponse = await axios.get(
        `${this.baseUrl}/v2/last/nbbo/${symbol}`,
        {
          params: { apikey: this.apiKey }
        }
      );
      
      const underlyingPrice = priceResponse.data.results?.[0]?.P || 100;

      // Get options contracts
      const contractsUrl = expiration ?
        `${this.baseUrl}/v3/reference/options/contracts` :
        `${this.baseUrl}/v3/reference/options/contracts`;
      
      const contractsResponse = await axios.get(contractsUrl, {
        params: {
          underlying_ticker: symbol,
          expiration_date: expiration,
          limit: 250,
          apikey: this.apiKey
        }
      });

      const contracts = contractsResponse.data.results || [];
      
      // Separate calls and puts
      const calls = [];
      const puts = [];
      let totalCallIV = 0;
      let totalPutIV = 0;
      let callCount = 0;
      let putCount = 0;

      for (const contract of contracts) {
        // Get detailed contract data including Greeks
        const detailResponse = await axios.get(
          `${this.baseUrl}/v2/last/trade/O:${contract.ticker}`,
          {
            params: { apikey: this.apiKey }
          }
        );
        
        const detail = detailResponse.data.results?.[0] || {};
        
        const contractData = {
          strike: contract.strike_price,
          expiry: contract.expiration_date,
          symbol: contract.ticker,
          lastPrice: detail.price || 0,
          bid: detail.bid || 0,
          ask: detail.ask || 0,
          volume: detail.volume || 0,
          openInterest: detail.open_interest || 0,
          impliedVolatility: detail.implied_volatility || 0.3,
          delta: detail.delta || 0,
          gamma: detail.gamma || 0,
          theta: detail.theta || 0,
          vega: detail.vega || 0
        };

        if (contract.contract_type === 'call') {
          calls.push(contractData);
          totalCallIV += contractData.impliedVolatility;
          callCount++;
        } else {
          puts.push(contractData);
          totalPutIV += contractData.impliedVolatility;
          putCount++;
        }
      }

      // Calculate averages
      const avgCallIV = callCount > 0 ? totalCallIV / callCount : 0;
      const avgPutIV = putCount > 0 ? totalPutIV / putCount : 0;
      const avgIV = (avgCallIV + avgPutIV) / 2;

      // Calculate net Greeks
      let netGamma = 0;
      let netDelta = 0;
      let totalCallVolume = 0;
      let totalPutVolume = 0;

      calls.forEach(c => {
        netGamma += c.gamma * c.openInterest;
        netDelta += c.delta * c.openInterest;
        totalCallVolume += c.volume;
      });

      puts.forEach(p => {
        netGamma += p.gamma * p.openInterest;
        netDelta -= p.delta * p.openInterest;
        totalPutVolume += p.volume;
      });

      const result = {
        symbol,
        underlyingPrice,
        calls,
        puts,
        avgIV,
        avgCallIV,
        avgPutIV,
        putCallRatio: totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 1,
        netGamma,
        netDelta,
        totalCallVolume,
        totalPutVolume,
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, JSON.stringify(result), 300);
      
      return result;
    } catch (error) {
      console.error(`Error fetching options chain for ${symbol}:`, error);
      
      // Return a minimal structure on error
      return {
        symbol,
        underlyingPrice: 100,
        calls: [],
        puts: [],
        avgIV: 0.3,
        avgCallIV: 0.3,
        avgPutIV: 0.3,
        putCallRatio: 1,
        netGamma: 0,
        netDelta: 0,
        totalCallVolume: 0,
        totalPutVolume: 0,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  /**
   * Get historical options data for backtesting
   */
  async getHistoricalOptionsData(
    symbol: string,
    from: string,
    to: string
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}`,
        {
          params: {
            adjusted: true,
            sort: 'asc',
            apikey: this.apiKey
          }
        }
      );
      
      return response.data.results || [];
    } catch (error) {
      console.error(`Error fetching historical options data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get options snapshot (current state of entire chain)
   */
  async getOptionsSnapshot(underlyingTicker: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/snapshot/options/${underlyingTicker}`,
        {
          params: {
            apikey: this.apiKey
          }
        }
      );
      
      return response.data.results || [];
    } catch (error) {
      console.error(`Error fetching options snapshot for ${underlyingTicker}:`, error);
      return [];
    }
  }

  /**
   * Get most active options contracts
   */
  async getMostActiveOptions(limit: number = 20): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/snapshot/options`,
        {
          params: {
            order: 'desc',
            sort: 'volume',
            limit,
            apikey: this.apiKey
          }
        }
      );
      
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching most active options:', error);
      return [];
    }
  }
}
