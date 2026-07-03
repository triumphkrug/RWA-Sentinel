/**
 * RWA Sentinel — Real Data Source Adapters.
 *
 * Provides a unified interface for fetching real-world data from various
 * external sources like GLEIF, CoinGecko, and OpenCorporates, with caching.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// --- Data Interfaces ---

/**
 * Interface for Legal Entity Identifier (LEI) data.
 */
export interface LeiData {
  lei: string;
  legalName: string;
  legalAddress: string;
  country: string;
  entityStatus: string;
  registrationStatus: string;
  // Add more fields as needed from GLEIF
}

/**
 * Interface for cryptocurrency price data.
 */
export interface PriceData {
  symbol: string;
  name: string;
  currentPriceUsd: number;
  lastUpdated: Date;
  // Add more fields as needed from CoinGecko
}

/**
 * Interface for company registry data.
 */
export interface CompanyData {
  companyNumber: string;
  name: string;
  jurisdiction: string;
  incorporationDate: Date;
  companyType: string;
  status: string;
  registeredAddress: string;
  // Add more fields as needed from OpenCorporates
}

// --- Adapter Configuration ---

/**
 * Configuration for the DataAdapterService.
 */
interface DataAdapterConfig {
  cacheTtlMinutes: number;
  gleifApiKey?: string; // GLEIF might not require an API key for public data
  coingeckoApiKey?: string; // CoinGecko has rate limits, API key for higher tiers
  opencorporatesApiKey?: string; // OpenCorporates requires API key for extensive use
}

/**
 * Unified service for fetching and caching real-world data.
 */
export class DataAdapterService {
  private readonly config: DataAdapterConfig;
  private readonly cache = new Map<string, { data: any; expiresAt: Date }>();

  constructor(config: DataAdapterConfig) {
    this.config = config;
    console.log('[data-adapter] Data adapter service initialized with cache TTL:', config.cacheTtlMinutes, 'minutes');
  }

  /**
   * Fetches data from a URL with caching.
   * @param cacheKey Unique key for the cache entry.
   * @param url The URL to fetch data from.
   * @param headers Optional headers for the request.
   * @returns The fetched data.
   * @throws Error if fetch fails.
   */
  private async fetchWithCache<T>(cacheKey: string, url: string, headers: Record<string, string> = {}): Promise<T> {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      console.log(`[data-adapter] Cache hit for ${cacheKey}`);
      return cached.data as T;
    }

    console.log(`[data-adapter] Cache miss for ${cacheKey}, fetching from ${url}`);
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
      }
      const data = await response.json();
      const expiresAt = new Date(Date.now() + this.config.cacheTtlMinutes * 60 * 1000);
      this.cache.set(cacheKey, { data, expiresAt });
      return data as T;
    } catch (error) {
      console.error(`[data-adapter] Error fetching ${url}:`, error);
      throw error;
    }
  }

  /**
   * Retrieves Legal Entity Identifier (LEI) data from GLEIF.
   * @param lei The LEI to look up.
   * @returns LEI data.
   */
  async getLei(lei: string): Promise<LeiData> {
    // GLEIF API endpoint example (public data)
    const url = `https://api.gleif.org/api/v1/lei-records/${lei}`;
    const data = await this.fetchWithCache<any>(`lei:${lei}`, url);

    // Map GLEIF response to LeiData interface
    const attributes = data?.data?.attributes;
    if (!attributes) {
      throw new Error(`LEI data not found for ${lei}`);
    }

    return {
      lei: attributes.lei,
      legalName: attributes.entity.legalName.name,
      legalAddress: attributes.entity.legalAddress.addressLines.join(', '),
      country: attributes.entity.legalAddress.country,
      entityStatus: attributes.entity.entityStatus,
      registrationStatus: attributes.registration.registrationStatus,
    };
  }

  /**
   * Retrieves cryptocurrency price data from CoinGecko.
   * @param symbol The cryptocurrency symbol (e.g., 'casper', 'ethereum').
   * @returns Price data.
   */
  async getPrice(symbol: string): Promise<PriceData> {
    // CoinGecko API endpoint example
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd&include_last_updated_at=true`;
    const headers: Record<string, string> = {};
    if (this.config.coingeckoApiKey) {
      headers['x-cg-pro-api-key'] = this.config.coingeckoApiKey;
    }

    const data = await this.fetchWithCache<any>(`price:${symbol}`, url, headers);

    const priceInfo = data[symbol];
    if (!priceInfo || !priceInfo.usd) {
      throw new Error(`Price data not found for ${symbol}`);
    }

    return {
      symbol,
      name: symbol, // CoinGecko simple price doesn't return full name, could use /coins/{id} for that
      currentPriceUsd: priceInfo.usd,
      lastUpdated: new Date(priceInfo.last_updated_at * 1000),
    };
  }

  /**
   * Retrieves company registry data from OpenCorporates.
   * @param jurisdiction The jurisdiction code (e.g., 'us_de', 'gb').
   * @param companyNumber The company registration number.
   * @returns Company data.
   */
  async getCompany(jurisdiction: string, companyNumber: string): Promise<CompanyData> {
    // OpenCorporates API endpoint example
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${companyNumber}&jurisdiction_code=${jurisdiction}`;
    const headers: Record<string, string> = {};
    if (this.config.opencorporatesApiKey) {
      headers['api_token'] = this.config.opencorporatesApiKey; // OpenCorporates uses query param or header
    }

    const data = await this.fetchWithCache<any>(`company:${jurisdiction}:${companyNumber}`, url, headers);

    const companyInfo = data?.results?.companies?.[0]?.company;
    if (!companyInfo) {
      throw new Error(`Company data not found for ${companyNumber} in ${jurisdiction}`);
    }

    return {
      companyNumber: companyInfo.company_number,
      name: companyInfo.name,
      jurisdiction: companyInfo.jurisdiction_code,
      incorporationDate: new Date(companyInfo.incorporation_date),
      companyType: companyInfo.company_type,
      status: companyInfo.current_status,
      registeredAddress: companyInfo.registered_address_in_full,
    };
  }

  /**
   * Clears the internal cache.
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[data-adapter] Cache cleared.');
  }

  /**
   * Gets current cache statistics.
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; expiresAt: Date }> } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        expiresAt: value.expiresAt,
      })),
    };
  }
}

/**
 * Fastify plugin for Real Data Adapters routes.
 */
const dataAdaptersRoutes: FastifyPluginAsync<{
  dataAdapterService: DataAdapterService;
}> = async (fastify, options) => {
  const { dataAdapterService } = options;

  fastify.get('/data/lei/:lei', {
    schema: {
      params: z.object({
        lei: z.string().regex(/^[0-9A-Z]{20}$/, 'Invalid LEI format'),
      }),
      response: {
        200: z.object({
          lei: z.string(),
          legalName: z.string(),
          legalAddress: z.string(),
          country: z.string(),
          entityStatus: z.string(),
          registrationStatus: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { lei } = request.params;
      const data = await dataAdapterService.getLei(lei);
      return reply.status(200).send(data);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(404).send({ error: error instanceof Error ? error.message : 'LEI data not found' });
    }
  });

  fastify.get('/data/price/:symbol', {
    schema: {
      params: z.object({
        symbol: z.string().min(1),
      }),
      response: {
        200: z.object({
          symbol: z.string(),
          name: z.string(),
          currentPriceUsd: z.number(),
          lastUpdated: z.string().datetime(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { symbol } = request.params;
      const data = await dataAdapterService.getPrice(symbol);
      return reply.status(200).send({ ...data, lastUpdated: data.lastUpdated.toISOString() });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(404).send({ error: error instanceof Error ? error.message : 'Price data not found' });
    }
  });

  fastify.get('/data/company/:jurisdiction/:id', {
    schema: {
      params: z.object({
        jurisdiction: z.string().min(1),
        id: z.string().min(1),
      }),
      response: {
        200: z.object({
          companyNumber: z.string(),
          name: z.string(),
          jurisdiction: z.string(),
          incorporationDate: z.string().datetime(),
          companyType: z.string(),
          status: z.string(),
          registeredAddress: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    try {
      const { jurisdiction, id } = request.params;
      const data = await dataAdapterService.getCompany(jurisdiction, id);
      return reply.status(200).send({ ...data, incorporationDate: data.incorporationDate.toISOString() });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(404).send({ error: error instanceof Error ? error.message : 'Company data not found' });
    }
  });

  fastify.get('/data/cache/stats', async (request, reply) => {
    const stats = dataAdapterService.getCacheStats();
    return reply.status(200).send({
      size: stats.size,
      entries: stats.entries.map(e => ({ key: e.key, expiresAt: e.expiresAt.toISOString() })),
    });
  });

  fastify.post('/data/cache/clear', async (request, reply) => {
    dataAdapterService.clearCache();
    return reply.status(200).send({ message: 'Cache cleared' });
  });
};

export default dataAdaptersRoutes;
