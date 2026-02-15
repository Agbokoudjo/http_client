/**
 * Translation Cache System
 * 
 * Professional caching system for managing translation messages with support for
 * multiple storage adapters (localStorage, IndexedDB/Dexie, custom implementations).
 * 
 * Designed for frameworks like Symfony Sonata Admin where translations are embedded
 * in meta tags and need efficient client-side caching.
 * 
 * @module TranslationCache
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 * @company INTERNATIONALES WEB APPS & SERVICES
 * @phone +229 0167 25 18 86
 * @linkedin https://www.linkedin.com/in/internationales-web-apps-services-120520193/
 * @package https://github.com/Agbokoudjo/form_validator
 * @version 1.0.0
 * @license MIT
 */

import { TranslationMessages } from "../types";

/**
 * Cache Translation Interface
 * 
 * Extends the base CacheItemInterface to provide specialized methods for
 * storing and retrieving translation messages. Implementations must handle
 * async operations and error recovery gracefully.
 * 
 * @interface CacheTranslationInterface
 * 
 * @example
 * ```typescript
 * class CustomCache implements CacheTranslationInterface {
 *     async getItem(key: string): Promise<TranslationMessages | null> {
 *         // Custom implementation
 *     }
 *     
 *     async setItem(key: string, messages: TranslationMessages): Promise<void> {
 *         // Custom implementation
 *     }
 * }
 * ```
 */
export interface FetchCacheTranslationInterface  {
    /**
     * Retrieves translation messages for a specific key (usually language code)
     * 
     * @param key - The cache key, typically a language code (e.g., 'en', 'fr', 'es')
     * @returns Promise resolving to translation messages object or null if not found
     * 
     * @throws Should not throw - implementations must handle errors internally
     * 
     * @example
     * ```typescript
     * const messages = await cache.getItem('en');
     * if (messages) {
     *     console.log(messages['LABEL_BTN_CONFIRM']); // "Confirm"
     * }
     * ```
     */
    getItem(key: string): Promise<TranslationMessages | null>;

    /**
     * Stores translation messages for a specific key
     * 
     * @param key - The cache key, typically a language code (e.g., 'en', 'fr', 'es')
     * @param messages - Translation messages object to store
     * @returns Promise that resolves when storage is complete
     * 
     * @throws Should not throw - implementations must handle errors internally
     * 
     * @example
     * ```typescript
     * await cache.setItem('en', {
     *     'CONFIRM': 'Confirm',
     *     'CANCEL': 'Cancel'
     * });
     * ```
     */
    setItem(key: string, messages: TranslationMessages): Promise<void>;

    /**
     * Optional: Clear all cached translations
     * 
     * @returns Promise that resolves when cache is cleared
     */
    clear?(): Promise<void>;

    /**
     * Optional: Check if a key exists in cache
     * 
     * @param key - The cache key to check
     * @returns Promise resolving to true if key exists, false otherwise
     */
    has?(key: string): Promise<boolean>;

    /**
     * Optional: Delete a specific cache entry
     * 
     * @param key - The cache key to delete
     * @returns Promise that resolves when deletion is complete
     */
    delete?(key: string): Promise<void>;
}

/**
 * Configuration Interface for Cache Adapter
 * 
 * Provides a standardized way to configure and access cache adapters.
 * Used for dependency injection and adapter swapping at runtime.
 * 
 * @interface ConfigCacheAdapterTranslation
 * 
 * @example
 * ```typescript
 * import { appTranslation } from "@wlindabla/form_validator";
 * 
 * // Configure with localStorage adapter
 * appTranslation.configAdapter = new LocalStorageCacheTranslationAdapter();
 * 
 * // Or configure with custom adapter
 * appTranslation.configAdapter = new DexieCacheAdapter();
 * ```
 */
export interface ConfigCacheAdapterTranslation {
    /**
     * Gets the configured cache adapter instance
     * 
     * @returns The cache adapter implementation
     */
    get configAdapter(): FetchCacheTranslationInterface;

    /**
     * Sets the cache adapter instance
     * 
     * @param adapter - The cache adapter to use
     */
    set configAdapter(adapter: FetchCacheTranslationInterface);
}
