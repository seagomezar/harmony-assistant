/**
 * Structured Logging and Analytics Service
 * Provides consistent logging and analytics event tracking
 */

import { getEnvConfig } from './environment.server.js';

/**
 * Log levels
 */
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Analytics event types
 */
export const ANALYTICS_EVENTS = {
  // Chat Events
  CHAT_SESSION_STARTED: 'chat_session_started',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_MESSAGE_RECEIVED: 'chat_message_received',
  CHAT_SESSION_ENDED: 'chat_session_ended',
  
  // AI Events
  AI_REQUEST_SENT: 'ai_request_sent',
  AI_RESPONSE_RECEIVED: 'ai_response_received',
  AI_ERROR: 'ai_error',
  AI_TOOL_INVOKED: 'ai_tool_invoked',
  
  // Product Events
  PRODUCT_SEARCH: 'product_search',
  PRODUCT_VIEW: 'product_view',
  CART_ADD_ITEM: 'cart_add_item',
  CART_REMOVE_ITEM: 'cart_remove_item',
  
  // User Events
  USER_AUTHENTICATED: 'user_authenticated',
  USER_ERROR: 'user_error',
  
  // System Events
  APP_STARTED: 'app_started',
  APP_ERROR: 'app_error',
  DEPLOYMENT_SUCCESS: 'deployment_success',
  DEPLOYMENT_ERROR: 'deployment_error',
  
  // Performance Events
  RESPONSE_TIME: 'response_time',
  API_LATENCY: 'api_latency',
  DATABASE_QUERY_TIME: 'database_query_time'
};

/**
 * Structured Logger Class
 */
export class StructuredLogger {
  constructor() {
    this.config = getEnvConfig();
    this.isStructuredEnabled = this.config.logging.enableStructuredLogging;
    this.logLevel = this.config.logging.logLevel;
    this.enableAnalytics = this.config.logging.enableChatAnalytics;
  }

  /**
   * Determines if a log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to log this level
   */
  shouldLog(level) {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Creates a structured log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   * @returns {Object} Structured log entry
   */
  createLogEntry(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      environment: this.config.nodeEnv,
      service: 'harmony-assistant',
      ...data
    };

    // Add correlation ID if available
    if (data.conversationId || data.sessionId) {
      logEntry.correlationId = data.conversationId || data.sessionId;
    }

    return logEntry;
  }

  /**
   * Outputs log entry
   * @param {Object} logEntry - Structured log entry
   */
  output(logEntry) {
    if (this.isStructuredEnabled) {
      console.log(JSON.stringify(logEntry));
    } else {
      // Fallback to simple logging
      console.log(`[${logEntry.timestamp}] ${logEntry.level.toUpperCase()}: ${logEntry.message}`);
    }
  }

  /**
   * Error logging
   * @param {string} message - Error message
   * @param {Object} data - Additional data
   * @param {Error} error - Error object
   */
  error(message, data = {}, error = null) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const logData = { ...data };
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const logEntry = this.createLogEntry(LOG_LEVELS.ERROR, message, logData);
    this.output(logEntry);
  }

  /**
   * Warning logging
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  warn(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;
    const logEntry = this.createLogEntry(LOG_LEVELS.WARN, message, data);
    this.output(logEntry);
  }

  /**
   * Info logging
   * @param {string} message - Info message
   * @param {Object} data - Additional data
   */
  info(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;
    const logEntry = this.createLogEntry(LOG_LEVELS.INFO, message, data);
    this.output(logEntry);
  }

  /**
   * Debug logging
   * @param {string} message - Debug message
   * @param {Object} data - Additional data
   */
  debug(message, data = {}) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;
    const logEntry = this.createLogEntry(LOG_LEVELS.DEBUG, message, data);
    this.output(logEntry);
  }

  /**
   * Analytics event tracking
   * @param {string} eventType - Type of event (from ANALYTICS_EVENTS)
   * @param {Object} properties - Event properties
   * @param {Object} context - Event context
   */
  trackEvent(eventType, properties = {}, context = {}) {
    if (!this.enableAnalytics) return;

    const eventData = {
      eventType,
      properties,
      context: {
        timestamp: new Date().toISOString(),
        environment: this.config.nodeEnv,
        service: 'harmony-assistant',
        ...context
      }
    };

    this.info('Analytics Event', { analytics: eventData });

    // TODO: Integrate with external analytics services
    this.sendToAnalytics(eventData);
  }

  /**
   * Sends analytics data to external services
   * @param {Object} eventData - Event data to send
   */
  sendToAnalytics(eventData) {
    // Google Analytics integration (if configured)
    if (this.config.analytics.enabled && this.config.analytics.googleAnalyticsId) {
      // Implementation would go here for GA4
      this.debug('Would send to Google Analytics', { eventData });
    }

    // Mixpanel integration (if configured)
    if (this.config.analytics.enabled && this.config.analytics.mixpanelToken) {
      // Implementation would go here for Mixpanel
      this.debug('Would send to Mixpanel', { eventData });
    }
  }

  /**
   * Performance tracking
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {Object} context - Additional context
   */
  trackPerformance(operation, duration, context = {}) {
    if (!this.config.logging.enablePerformanceMonitoring) return;

    this.trackEvent(ANALYTICS_EVENTS.RESPONSE_TIME, {
      operation,
      duration,
      ...context
    });

    this.info('Performance Metric', {
      operation,
      duration,
      ...context
    });
  }

  /**
   * Chat-specific analytics
   */
  trackChatEvent(eventType, data = {}) {
    this.trackEvent(eventType, data, { module: 'chat' });
  }

  /**
   * AI-specific analytics
   */
  trackAIEvent(eventType, data = {}) {
    this.trackEvent(eventType, data, { module: 'ai' });
  }

  /**
   * Product-specific analytics
   */
  trackProductEvent(eventType, data = {}) {
    this.trackEvent(eventType, data, { module: 'product' });
  }
}

// Create and export singleton instance
const logger = new StructuredLogger();
export default logger;

// Export convenience functions
export const logError = (message, data, error) => logger.error(message, data, error);
export const logWarn = (message, data) => logger.warn(message, data);
export const logInfo = (message, data) => logger.info(message, data);
export const logDebug = (message, data) => logger.debug(message, data);
export const trackEvent = (eventType, properties, context) => logger.trackEvent(eventType, properties, context);
export const trackPerformance = (operation, duration, context) => logger.trackPerformance(operation, duration, context);
export const trackChatEvent = (eventType, data) => logger.trackChatEvent(eventType, data);
export const trackAIEvent = (eventType, data) => logger.trackAIEvent(eventType, data);
export const trackProductEvent = (eventType, data) => logger.trackProductEvent(eventType, data);