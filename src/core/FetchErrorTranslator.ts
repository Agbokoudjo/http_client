/**
 * Fetch Error Translator
 * 
 * Enterprise-grade translation system for Fetch API errors with intelligent
 * pattern matching, multi-language support, and configurable caching.
 * 
 * Features:
 * - Multi-language error translations (en, fr, es, and extensible)
 * - Intelligent pattern matching for unknown errors
 * - Configurable cache adapters for persistent storage
 * - Automatic language detection from DOM
 * - SSL/TLS specific error handling
 * - Type-safe with full TypeScript support
 * 
 * @module FetchErrorTranslator
 * @author AGBOKOUDJO Franck <internationaleswebservices@gmail.com>
 * @company INTERNATIONALES WEB APPS & SERVICES
 * @phone +229 0167 25 18 86
 * @linkedin https://www.linkedin.com/in/internationales-web-apps-services-120520193/
 * @package https://github.com/Agbokoudjo/
 * @version 1.0.0
 * @license MIT
 */

import {
    ErrorTranslations,
    ErrorPattern,
    TranslationMessages
} from "../types";

import {
    ConfigCacheAdapterTranslation,
    FetchCacheTranslationInterface
} from "../cache";

import { hasProperty } from "../utils";

/**
 * Translation configuration options
 */
export interface FetchErrorTranslatorConfig {
    /** Default language code */
    defaultLanguage?: string;
    /** Cache adapter instance */
    cacheAdapter?: FetchCacheTranslationInterface;
    /** Enable debug logging */
    debug?: boolean;
    /** Custom error patterns for matching */
    customPatterns?: ErrorPattern[];
    /** Additional translations to merge with defaults */
    additionalTranslations?: ErrorTranslations;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<FetchErrorTranslatorConfig, 'cacheAdapter' |'customPatterns' | 'additionalTranslations'>> = {
    defaultLanguage: 'en',
    debug: false
};

/**
 * Cache key prefix for error translations
 */
const CACHE_KEY_PREFIX = 'fetch_error_translation_';

/**
 * Default error patterns for intelligent matching
 */
const DEFAULT_PATTERNS: ErrorPattern[] = [
    { keywords: ['network', 'failed to fetch'], errorKey: 'NetworkError' },
    { keywords: ['timeout', 'abort'], errorKey: 'AbortError' },
    { keywords: ['cors'], errorKey: 'SecurityError' },
    { keywords: ['dns', 'not found'], errorKey: 'NotFoundError' }
];

export interface FetchErrorTranslatorInterface {
    trans(errorName: string, error?: Error | null, language?: string): string;
}

/**
 * FetchErrorTranslator
 * 
 * Main class for translating Fetch API errors into user-friendly messages
 * with multi-language support and intelligent error detection.
 * 
 * **Usage Example:**
 * ```typescript
 * import { fetchErrorTranslator } from '@wlindabla/http_client';
 * 
 * try {
 *     await fetch('/api/data');
 * } catch (error) {
 *     const message = fetchErrorTranslator.trans(error.name, error);
 *     console.error(message); // "Network error - Check your internet connection"
 * }
 * 
 * // With specific language
 * const frenchMessage = fetchErrorTranslator.trans(error.name, error, 'fr');
 * console.error(frenchMessage); // "Erreur réseau - Vérifiez votre connexion internet"
 * ```
 * 
 * @class FetchErrorTranslator
 * @implements {ConfigCacheAdapterTranslation}
 */
export class FetchErrorTranslator implements ConfigCacheAdapterTranslation, FetchErrorTranslatorInterface {
    /**
     * Singleton instance
     * @private
     */
    private static instance: FetchErrorTranslator | null = null;

    /**
     * Cache adapter for persistent storage
     * @private
     */
    private adapter: FetchCacheTranslationInterface;

    /**
     * In-memory translation storage
     * @private
     */
    private translationStore: Map<string, TranslationMessages>;

    /**
     * Current language detected from DOM
     * @private
     */
    private readonly currentLanguage: string;

    /**
     * Configuration options
     * @private
     */
    private readonly config: FetchErrorTranslatorConfig;

    /**
     * Custom error patterns
     * @private
     */
    private readonly errorPatterns: ErrorPattern[];

    /**
     * Flag to track initialization
     * @private
     */
    private isInitialized: boolean;

    /**
     * Creates a new FetchErrorTranslator instance
     * 
     * @param config - Optional configuration object
     * 
     * @example
     * ```typescript
     * // With default configuration
     * const translator = new FetchErrorTranslator();
     * 
     * // With custom configuration
     * const translator = new FetchErrorTranslator({
     *     defaultLanguage: 'fr',
     *     debug: true,
     *     cacheAdapter: new CustomCacheAdapter()
     * });
     * ```
     */
    constructor(config: FetchErrorTranslatorConfig = {}) {
        // Merge configuration
        this.config = {
            ...DEFAULT_CONFIG,
            ...config
        };

        // Set adapter
        if(!config.cacheAdapter){
            throw new Error(`cacheAdpater must instance of FetchCacheTranslationInterface`)
        }

        this.adapter = config.cacheAdapter ;

        // Detect language
        this.currentLanguage = this.config.defaultLanguage ?? "en";

        // Initialize storage
        this.translationStore = new Map<string, TranslationMessages>();

        // Set error patterns
        this.errorPatterns = [
            ...DEFAULT_PATTERNS,
            ...(config.customPatterns || [])
        ];

        // Track initialization
        this.isInitialized = false;

        // Initialize with default translations
        this.initializeDefaultTranslations();

        this.logDebug('FetchErrorTranslator initialized', {
            language: this.currentLanguage,
            adapter: this.adapter.constructor.name
        });
    }

    /**
     * Gets the singleton instance
     * 
     * @param config - Optional configuration for first initialization
     * @returns Singleton instance
     * 
     * @example
     * ```typescript
     * const translator = FetchErrorTranslator.getInstance();
     * 
     * // Or with custom config
     * const translator = FetchErrorTranslator.getInstance({
     *     defaultLanguage: 'fr'
     * });
     * ```
     */
    public static getInstance(config?: FetchErrorTranslatorConfig): FetchErrorTranslator {
        if (!FetchErrorTranslator.instance) {
            FetchErrorTranslator.instance = new FetchErrorTranslator(config);
        }
        return FetchErrorTranslator.instance;
    }

    /**
     * Resets the singleton instance
     * Useful for testing or re-initialization
     */
    public static resetInstance(): void {
        FetchErrorTranslator.instance = null;
    }

    /**
    * Translates an error to a user-friendly message
    * 
    * Uses exact matching first, then falls back to pattern matching.
    * Automatically uses current language unless specified.
    * 
    * @param errorName - Error name (e.g., 'AbortError', 'NetworkError')
    * @param error - Optional Error object for pattern matching
    * @param language - Optional language code (uses current language if not specified)
    * @returns Translated error message
    * 
    * @example
    * ```typescript
    * // Simple translation
    * const message = translator.trans('NetworkError');
    * 
    * // With error object for pattern matching
    * try {
    *     await fetch('/api/data');
    * } catch (error) {
    *     const message = translator.trans(error.name, error);
    *     console.error(message);
    * }
    * 
    * // With specific language
    * const frenchMessage = translator.trans('AbortError', null, 'fr');
    * ```
    */
    public trans(errorName: string, error?: Error | null, language?: string): string {
        return this.translate(errorName, error, language);
    }

    private translate(errorName: string, error?: Error | null, language?: string): string {
        const lang = language || this.currentLanguage;

        try {
            // Ensure translations are loaded
            this.ensureLanguageLoaded(lang);

            // Get translations for language
            const translations = this.translationStore.get(lang);

            if (!translations) {
                this.logDebug(`No translations for language: ${lang}`);
                return this.getFallbackMessage(lang);
            }

            // Exact match
            if (this.hasTranslation(translations, errorName)) {
                return translations[errorName]!;
            }

            // Pattern matching fallback
            if (error) {
                return this.translateByPattern(lang, translations, error);
            }

            // Final fallback
            return this.getFallbackMessage(lang);

        } catch (err) {
            this.logError('Translation failed', err, { errorName, language: lang });
            return this.getFallbackMessage(lang);
        }
    }

    /**
     * Adds custom translations for a language
     * 
     * Merges with existing translations, allowing extension without replacement.
     * 
     * @param language - Language code (e.g., 'en', 'fr', 'de')
     * @param translations - Error name to message mappings
     * 
     * @example
     * ```typescript
     * // Add German translations
     * translator.addTranslations('de', {
     *     'AbortError': 'Anfrage hat Zeitüberschreitung überschritten',
     *     'NetworkError': 'Netzwerkfehler - Überprüfen Sie Ihre Internetverbindung'
     * });
     * 
     * // Extend existing English translations
     * translator.addTranslations('en', {
     *     'CustomError': 'A custom error occurred'
     * });
     * ```
     */
    public addTranslations(language: string, translations: TranslationMessages): void {
        this.validateLanguageCode(language);
        this.validateTranslations(translations);

        // Get existing or create new
        const existing = this.translationStore.get(language) || {};

        // Merge translations
        const merged = { ...existing, ...translations };

        // Store in memory
        this.translationStore.set(language, merged);

        // Cache for persistence
        this.cacheTranslations(language, merged);

        this.logDebug(`Added translations for language: ${language}`, {
            count: Object.keys(translations).length
        });
    }

    /**
     * Gets all supported languages
     * 
     * @returns Array of language codes
     * 
     * @example
     * ```typescript
     * const languages = translator.getSupportedLanguages();
     * console.log(languages); // ['en', 'fr', 'es', 'de']
     * ```
     */
    public getSupportedLanguages(): string[] {
        return Array.from(this.translationStore.keys());
    }

    /**
     * Gets all supported error names for a language
     * 
     * @param language - Language code (uses current language if not specified)
     * @returns Array of error names
     * 
     * @example
     * ```typescript
     * const errorNames = translator.getSupportedErrorNames('en');
     * console.log(errorNames);
     * // ['AbortError', 'TypeError', 'NetworkError', 'SecurityError', ...]
     * ```
     */
    public getSupportedErrorNames(language?: string): string[] {
        const lang = language || this.currentLanguage;
        const translations = this.translationStore.get(lang);
        return translations ? Object.keys(translations) : [];
    }

    /**
     * Checks if a translation exists for an error name
     * 
     * @param errorName - Error name to check
     * @param language - Optional language code
     * @returns True if translation exists
     * 
     * @example
     * ```typescript
     * if (translator.hasTranslation('AbortError')) {
     *     console.log('Translation available');
     * }
     * ```
     */
    public hasTranslationFor(errorName: string, language?: string): boolean {
        const lang = language || this.currentLanguage;
        const translations = this.translationStore.get(lang);
        return translations ? this.hasTranslation(translations, errorName) : false;
    }

    /**
     * Exports translations for a language
     * 
     * Useful for debugging, caching, or serialization.
     * 
     * @param language - Language code
     * @returns Translations object or empty object if not found
     * 
     * @example
     * ```typescript
     * const enTranslations = translator.exportTranslations('en');
     * console.log(JSON.stringify(enTranslations, null, 2));
     * ```
     */
    public exportTranslations(language: string): TranslationMessages {
        return this.translationStore.get(language) || {};
    }

    /**
     * Clears all cached translations
     * 
     * @returns Promise that resolves when cache is cleared
     * 
     * @example
     * ```typescript
     * await translator.clearCache();
     * console.log('Cache cleared');
     * ```
     */
    public async clearCache(): Promise<void> {
        try {
            await this.adapter.clear?.();
            this.logDebug('Cache cleared');
            console.log(this.isInitialized)
        } catch (error) {
            this.logError('Failed to clear cache', error);
        }
    }

    /**
     * Gets current language
     * 
     * @returns Current language code
     * 
     * @example
     * ```typescript
     * const lang = translator.getCurrentLanguage();
     * console.log(lang); // "en"
     * ```
     */
    public getCurrentLanguage(): string {
        return this.currentLanguage;
    }

    /**
     * Preloads translations for a language
     * 
     * @param language - Language code to preload
     * @returns Promise that resolves when loaded
     * 
     * @example
     * ```typescript
     * await translator.preload('fr');
     * console.log('French translations preloaded');
     * ```
     */
    public async preload(language: string): Promise<void> {
        await this.ensureLanguageLoaded(language);
        this.logDebug(`Translations preloaded for: ${language}`);
    }

    /**
     * Gets the current cache adapter
     */
    public get configAdapter(): FetchCacheTranslationInterface {
        return this.adapter;
    }

    /**
     * Sets a new cache adapter
     * 
     * @param adapter - New cache adapter instance
     * 
     * @example
     * ```typescript
     * import { DexieCacheAdapter } from './adapters';
     * 
     * translator.configAdapter = new DexieCacheAdapter();
     * ```
     */
    public set configAdapter(adapter: FetchCacheTranslationInterface) {
        if (!adapter) {
            throw new TypeError('Cache adapter cannot be null or undefined');
        }

        this.adapter = adapter;
        this.logDebug('Cache adapter changed', {
            newAdapter: adapter.constructor.name
        });
    }

    /**
     * Initializes default translations
     * @private
     */
    private initializeDefaultTranslations(): void {
        const defaults = this.getDefaultTranslations();

        for (const [language, translations] of Object.entries(defaults)) {
            this.translationStore.set(language, translations);
        }

        // Merge additional translations if provided
        if (this.config.additionalTranslations) {
            for (const [lang, trans] of Object.entries(this.config.additionalTranslations)) {
                this.addTranslations(lang, trans);
            }
        }

        this.isInitialized = true;
    }

    /**
     * Ensures translations are loaded for a language
     * @private
     */
    private async ensureLanguageLoaded(language: string): Promise<void> {
        if (this.translationStore.has(language)) {
            return;
        }

        try {
            // Try to load from cache
            const cached = await this.adapter.getItem(this.getCacheKey(language));

            if (cached) {
                this.translationStore.set(language, cached);
                this.logDebug(`Translations loaded from cache: ${language}`);
            }
        } catch (error) {
            this.logError(`Failed to load translations for: ${language}`, error);
        }
    }

    /**
     * Caches translations for persistence
     * @private
     */
    private async cacheTranslations(language: string, translations: TranslationMessages): Promise<void> {
        try {
            await this.adapter.setItem(this.getCacheKey(language), translations);
        } catch (error) {
            this.logError('Failed to cache translations', error, { language });
        }
    }

    /**
     * Gets cache key for a language
     * @private
     */
    private getCacheKey(language: string): string {
        return `${CACHE_KEY_PREFIX}${language}`;
    }

    /**
     * Translates using pattern matching
     * @private
     */
    private translateByPattern(
        language: string,
        translations: TranslationMessages,
        error: Error
    ): string {
        const message = error.message?.toLowerCase() || '';

        // Check custom patterns
        for (const { keywords, errorKey } of this.errorPatterns) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return translations[errorKey] || this.getFallbackMessage(language);
            }
        }

        // Check SSL/TLS errors
        if (['ssl', 'tls', 'certificate'].some(keyword => message.includes(keyword))) {
            return this.getSSLErrorMessage(language);
        }

        return this.getFallbackMessage(language);
    }

    /**
     * Gets fallback message
     * @private
     */
    private getFallbackMessage(language: string): string {
        const fallbacks: Record<string, string> = {
            fr: 'Une erreur inconnue s\'est produite. Veuillez réessayer.',
            en: 'An unknown error occurred. Please try again.',
            es: 'Ocurrió un error desconocido. Por favor, inténtelo de nuevo.',
            de: 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'
        };

        return fallbacks[language] || fallbacks['en'] as string;
    }

    /**
     * Gets SSL error message
     * @private
     */
    private getSSLErrorMessage(language: string): string {
        const sslMessages: Record<string, string> = {
            fr: 'Erreur de certificat SSL - Le serveur n\'est pas sécurisé',
            en: 'SSL Certificate error - Server is not secure',
            es: 'Error de certificado SSL - El servidor no es seguro',
            de: 'SSL-Zertifikatfehler - Server ist nicht sicher'
        };

        return sslMessages[language] || sslMessages['en'] as string;
    }

    /**
     * Gets default translations
     * @private
     */
    private getDefaultTranslations(): ErrorTranslations {
        return {
            en: {
                'AbortError': 'Request timed out because the server did not respond within the specified time.',
                'TypeError': 'Network error - Check your internet connection',
                'NetworkError': 'Network error - Connection impossible',
                'SecurityError': 'Security error - Access denied (CORS)',
                'NotFoundError': 'Resource not found',
                'TimeoutError': 'Request timeout',
                'InvalidStateError': 'Invalid request - Invalid state',
                'SyntaxError': 'Syntax error in response',
                'ReferenceError': 'Reference error',
                'RangeError': 'Value out of range'
            },
            fr: {
                'AbortError': 'La requête a expiré car le serveur n\'a pas répondu dans le délai imparti.',
                'TypeError': 'Erreur réseau - Vérifiez votre connexion internet',
                'NetworkError': 'Erreur réseau - Connexion impossible,Vérifiez votre connexion internet',
                'SecurityError': 'Erreur de sécurité - Accès non autorisé (CORS)',
                'NotFoundError': 'Ressource non trouvée',
                'TimeoutError': 'Délai d\'attente dépassé',
                'InvalidStateError': 'Requête invalide - État non valide',
                'SyntaxError': 'Erreur de syntaxe dans la réponse',
                'ReferenceError': 'Erreur de référence',
                'RangeError': 'Valeur hors limites'
            },
            es: {
                'AbortError': 'Tiempo de espera agotado - El servidor no respondió a tiempo',
                'TypeError': 'Error de red - Verifique su conexión a internet',
                'NetworkError': 'Error de red - Conexión imposible',
                'SecurityError': 'Error de seguridad - Acceso denegado (CORS)',
                'NotFoundError': 'Recurso no encontrado',
                'TimeoutError': 'Tiempo de espera agotado',
                'InvalidStateError': 'Solicitud inválida - Estado no válido',
                'SyntaxError': 'Error de sintaxis en la respuesta',
                'ReferenceError': 'Error de referencia',
                'RangeError': 'Valor fuera de rango'
            }
        };
    }

    /**
     * Checks if translation exists
     * @private
     */
    private hasTranslation(translations: TranslationMessages, errorName: string): boolean {
        return hasProperty(translations, errorName);
    }

    /**
     * Validates language code
     * @private
     */
    private validateLanguageCode(language: string): void {
        if (!language || typeof language !== 'string') {
            throw new TypeError('Language code must be a non-empty string');
        }

        if (language.trim() === '') {
            throw new TypeError('Language code cannot be empty or whitespace');
        }
    }

    /**
     * Validates translations object
     * @private
     */
    private validateTranslations(translations: TranslationMessages): void {
        if (!translations || typeof translations !== 'object') {
            throw new TypeError('Translations must be an object');
        }

        for (const [key, value] of Object.entries(translations)) {
            if (typeof key !== 'string' || typeof value !== 'string') {
                throw new TypeError(`Invalid translation: key and value must be strings`);
            }
        }
    }

    /**
     * Debug logging
     * @private
     */
    private logDebug(message: string, data?: unknown): void {
        if (this.config.debug) {
            console.log(`[FetchErrorTranslator] ${message}`, data || '');
        }
    }

    /**
     * Error logging
     * @private
     */
    private logError(message: string, error: unknown, context?: Record<string, unknown>): void {
        console.error(`[FetchErrorTranslator] ${message}`, {
            error: error instanceof Error ? error.message : String(error),
            context
        });
    }
}

/**
 * Global singleton instance for convenient access
 * 
 * @example
 * ```typescript
 * import { fetchErrorTranslator } from '@wlindabla/http_client';
 * 
 * try {
 *     await fetch('/api/data');
 * } catch (error) {
 *     const message = fetchErrorTranslator.trans(error.name, error);
 *     console.error(message);
 * }
 * ```
 */
export const fetchErrorTranslator = FetchErrorTranslator.getInstance();