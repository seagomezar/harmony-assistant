/**
 * Environment Configuration and Validation Service
 * Centralizes environment variable handling and validation
 */

/**
 * Required environment variables by environment type
 */
const REQUIRED_ENV_VARS = {
  all: [
    'NODE_ENV',
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_APP_URL',
    'CLAUDE_API_KEY',
    'DATABASE_URL',
    'REDIRECT_URL'
  ],
  production: [
    'SESSION_SECRET',
    'RENDER_SERVICE_NAME'
  ],
  development: [
    'HMR_SERVER_PORT'
  ]
};

/**
 * Default values for optional environment variables
 */
const DEFAULT_VALUES = {
  NODE_ENV: 'development',
  PORT: '3000',
  AI_PROVIDER: 'claude',
  LOG_LEVEL: 'info',
  ENABLE_STRUCTURED_LOGGING: 'true',
  ENABLE_CHAT_ANALYTICS: 'true',
  ENABLE_PERFORMANCE_MONITORING: 'false',
  SCOPES: 'customer_read_customers,customer_read_orders,customer_read_store_credit_account_transactions,customer_read_store_credit_accounts,unauthenticated_read_product_listings'
};

/**
 * Environment configuration class
 */
export class EnvironmentConfig {
  constructor() {
    this.validateEnvironment();
    this.setDefaults();
  }

  /**
   * Validates that all required environment variables are set
   * @throws {Error} If required environment variables are missing
   */
  validateEnvironment() {
    const env = process.env.NODE_ENV || 'development';
    const missing = [];

    // Check universal required variables
    REQUIRED_ENV_VARS.all.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });

    // Check environment-specific required variables
    if (REQUIRED_ENV_VARS[env]) {
      REQUIRED_ENV_VARS[env].forEach(varName => {
        if (!process.env[varName]) {
          missing.push(varName);
        }
      });
    }

    if (missing.length > 0) {
      const errorMsg = `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `Environment: ${env}`;
      throw new Error(errorMsg);
    }
  }

  /**
   * Sets default values for optional environment variables
   */
  setDefaults() {
    Object.entries(DEFAULT_VALUES).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  }

  /**
   * Gets environment configuration with type conversion
   */
  getConfig() {
    return {
      // Environment
      nodeEnv: process.env.NODE_ENV,
      port: parseInt(process.env.PORT || '3000'),
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isStaging: process.env.NODE_ENV === 'staging',

      // Shopify
      shopify: {
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecret: process.env.SHOPIFY_API_SECRET,
        appUrl: process.env.SHOPIFY_APP_URL,
        scopes: process.env.SCOPES?.split(',') || [],
        customDomain: process.env.SHOP_CUSTOM_DOMAIN
      },

      // AI Services
      ai: {
        provider: process.env.AI_PROVIDER || 'claude',
        claudeApiKey: process.env.CLAUDE_API_KEY,
        geminiApiKey: process.env.GEMINI_API_KEY
      },

      // Database
      database: {
        url: process.env.DATABASE_URL
      },

      // Authentication
      auth: {
        redirectUrl: process.env.REDIRECT_URL,
        sessionSecret: process.env.SESSION_SECRET
      },

      // Deployment
      deployment: {
        renderServiceName: process.env.RENDER_SERVICE_NAME,
        hmrServerPort: parseInt(process.env.HMR_SERVER_PORT || '8002'),
        frontendPort: parseInt(process.env.FRONTEND_PORT || '8002')
      },

      // Logging & Analytics
      logging: {
        enableStructuredLogging: process.env.ENABLE_STRUCTURED_LOGGING === 'true',
        logLevel: process.env.LOG_LEVEL || 'info',
        enableChatAnalytics: process.env.ENABLE_CHAT_ANALYTICS === 'true',
        enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
      },

      // Analytics (optional)
      analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
        mixpanelToken: process.env.MIXPANEL_TOKEN
      }
    };
  }

  /**
   * Logs environment configuration (safely, without secrets)
   */
  logConfig() {
    const config = this.getConfig();
    const safeConfig = {
      environment: config.nodeEnv,
      port: config.port,
      aiProvider: config.ai.provider,
      deployment: {
        renderServiceName: config.deployment.renderServiceName
      },
      logging: config.logging,
      shopifyAppUrl: config.shopify.appUrl
    };

    console.log('Environment configuration loaded:', JSON.stringify(safeConfig, null, 2));
  }
}

// Create and export singleton instance
const envConfig = new EnvironmentConfig();
export default envConfig;

/**
 * Utility function to get environment configuration
 */
export function getEnvConfig() {
  return envConfig.getConfig();
}

/**
 * Utility function to check if we're in a specific environment
 */
export function isEnvironment(env) {
  return process.env.NODE_ENV === env;
}

/**
 * Utility function to get a required environment variable
 * @param {string} varName - Name of the environment variable
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Environment variable value
 * @throws {Error} If variable is required but not set
 */
export function getEnvVar(varName, defaultValue = null) {
  const value = process.env[varName];
  
  if (!value && defaultValue === null) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
  
  return value || defaultValue;
}