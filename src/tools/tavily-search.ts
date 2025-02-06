import axios from 'axios';
import { TAVILY_API_KEY } from "../config";
import { TavilySearchResponse } from '../types';

/**
 * Performs a search using the Tavily API
 * @param query - The search query
 * @param searchDepth - Optional: 'basic' (faster) or 'advanced' (more comprehensive)
 * @param maxResults - Optional: number of results to return (default: 5)
 */
export async function tavilySearch(
  query: string, 
  searchDepth: 'basic' | 'advanced' = 'basic',
  maxResults: number = 5
): Promise<{ response: TavilySearchResponse }> {
  const response = await axios.post<TavilySearchResponse>(
    'https://api.tavily.com/search',
    {
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_domains: [], // Optional: specific domains to include
      exclude_domains: [], // Optional: specific domains to exclude
      api_key: TAVILY_API_KEY,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000 // 30 seconds timeout
    }
  );

  return { response: response.data };
} 