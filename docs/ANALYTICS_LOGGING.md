# Analytics and Logging Guide

This guide explains the structured logging system and analytics tracking implemented in the Harmony Assistant application.

## Overview

The application includes a comprehensive logging and analytics system that provides:
- Structured JSON logging
- Event tracking for user interactions
- Performance monitoring
- Error tracking and debugging
- Integration with external analytics platforms

## Structured Logging System

### Features

- **Environment-aware logging** - Different log levels per environment
- **Structured JSON output** - Machine-readable log format
- **Correlation IDs** - Track requests across services
- **Performance metrics** - Response time and latency tracking
- **Error handling** - Comprehensive error logging with stack traces

### Usage

```javascript
import logger, { 
  logInfo, 
  logError, 
  trackEvent, 
  ANALYTICS_EVENTS 
} from './app/services/logger.server.js';

// Basic logging
logger.info('User logged in', { userId: '123', shop: 'example.myshopify.com' });
logger.error('API call failed', { endpoint: '/api/chat' }, error);

// Convenience functions
logInfo('Operation completed', { duration: 250 });
logError('Database error', { query: 'SELECT * FROM users' }, error);

// Analytics events
trackEvent(ANALYTICS_EVENTS.CHAT_SESSION_STARTED, {
  userId: '123',
  conversationId: 'conv_456'
});
```

### Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `error` | System errors, exceptions | Critical issues that need immediate attention |
| `warn` | Warning conditions | Potential issues, deprecated usage |
| `info` | Informational messages | Normal application flow, key events |
| `debug` | Debug information | Detailed information for troubleshooting |

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Chat session started",
  "environment": "production",
  "service": "harmony-assistant",
  "correlationId": "conv_456",
  "userId": "123",
  "shop": "example.myshopify.com",
  "data": {
    "sessionType": "chat",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Analytics Events

### Event Categories

#### Chat Events
- `chat_session_started` - User starts a chat session
- `chat_message_sent` - User sends a message
- `chat_message_received` - AI responds to user
- `chat_session_ended` - Chat session ends

#### AI Events
- `ai_request_sent` - Request sent to AI service
- `ai_response_received` - Response received from AI
- `ai_error` - AI service error
- `ai_tool_invoked` - AI tool/function called

#### Product Events
- `product_search` - User searches for products
- `product_view` - Product displayed to user
- `cart_add_item` - Item added to cart
- `cart_remove_item` - Item removed from cart

#### System Events
- `app_started` - Application startup
- `app_error` - System-level error
- `deployment_success` - Successful deployment
- `deployment_error` - Deployment failure

#### Performance Events
- `response_time` - HTTP response time
- `api_latency` - External API call latency
- `database_query_time` - Database query performance

### Event Tracking Examples

```javascript
import { trackChatEvent, trackAIEvent, trackProductEvent, ANALYTICS_EVENTS } from './app/services/logger.server.js';

// Chat analytics
trackChatEvent(ANALYTICS_EVENTS.CHAT_SESSION_STARTED, {
  conversationId: 'conv_123',
  userId: 'user_456',
  shop: 'example.myshopify.com',
  userAgent: request.headers.get('user-agent')
});

// AI analytics
trackAIEvent(ANALYTICS_EVENTS.AI_REQUEST_SENT, {
  provider: 'claude',
  model: 'claude-3-5-sonnet',
  tokens: 150,
  conversationId: 'conv_123'
});

// Product analytics
trackProductEvent(ANALYTICS_EVENTS.PRODUCT_SEARCH, {
  query: 'red shoes',
  resultsCount: 12,
  userId: 'user_456'
});

// Performance analytics
import { trackPerformance } from './app/services/logger.server.js';

const startTime = Date.now();
// ... perform operation
const duration = Date.now() - startTime;

trackPerformance('database_query', duration, {
  operation: 'user_lookup',
  query: 'SELECT * FROM users WHERE id = ?'
});
```

## Configuration

### Environment Variables

Configure logging behavior through environment variables:

```bash
# Enable/disable structured logging
ENABLE_STRUCTURED_LOGGING=true

# Set log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable chat analytics
ENABLE_CHAT_ANALYTICS=true

# Enable performance monitoring
ENABLE_PERFORMANCE_MONITORING=true

# External analytics services
ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your_mixpanel_token
```

### Per-Environment Configuration

#### Development
```bash
LOG_LEVEL=debug
ENABLE_STRUCTURED_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=false
```

#### Staging
```bash
LOG_LEVEL=debug
ENABLE_STRUCTURED_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
```

#### Production
```bash
LOG_LEVEL=info
ENABLE_STRUCTURED_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
ANALYTICS_ENABLED=true
```

## External Analytics Integration

### Google Analytics 4

To integrate with Google Analytics:

1. **Set up GA4 property** in Google Analytics console
2. **Configure environment variable**:
   ```bash
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   ANALYTICS_ENABLED=true
   ```

3. **Track events** (implementation in logger service):
   ```javascript
   // Events are automatically sent to GA4 when configured
   trackEvent(ANALYTICS_EVENTS.PRODUCT_VIEW, {
     product_id: 'prod_123',
     product_name: 'Red Sneakers',
     price: 99.99
   });
   ```

### Mixpanel

To integrate with Mixpanel:

1. **Create Mixpanel project** and get project token
2. **Configure environment variable**:
   ```bash
   MIXPANEL_TOKEN=your_project_token
   ANALYTICS_ENABLED=true
   ```

3. **Track events**:
   ```javascript
   trackEvent(ANALYTICS_EVENTS.CHAT_SESSION_STARTED, {
     user_id: 'user_123',
     conversation_type: 'product_inquiry'
   });
   ```

### Custom Analytics Services

To add custom analytics services, extend the logger service:

```javascript
// app/services/logger.server.js

sendToAnalytics(eventData) {
  // Google Analytics integration
  if (this.config.analytics.enabled && this.config.analytics.googleAnalyticsId) {
    this.sendToGoogleAnalytics(eventData);
  }

  // Mixpanel integration
  if (this.config.analytics.enabled && this.config.analytics.mixpanelToken) {
    this.sendToMixpanel(eventData);
  }

  // Custom service integration
  if (this.config.analytics.customServiceUrl) {
    this.sendToCustomService(eventData);
  }
}

sendToCustomService(eventData) {
  fetch(this.config.analytics.customServiceUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  }).catch(error => {
    this.error('Failed to send analytics to custom service', { error: error.message });
  });
}
```

## Log Collection and Analysis

### ELK Stack (Elasticsearch, Logstash, Kibana)

1. **Configure Logstash** to parse JSON logs:
   ```ruby
   input {
     file {
       path => "/var/log/harmony-assistant.log"
       codec => "json"
     }
   }
   
   filter {
     if [service] == "harmony-assistant" {
       mutate {
         add_tag => ["harmony-assistant"]
       }
     }
   }
   
   output {
     elasticsearch {
       hosts => ["elasticsearch:9200"]
       index => "harmony-assistant-%{+YYYY.MM.dd}"
     }
   }
   ```

2. **Create Kibana dashboards** for:
   - Error rate monitoring
   - Response time analysis
   - User interaction patterns
   - AI usage metrics

### Splunk

1. **Configure Splunk forwarder** to collect logs
2. **Create searches and alerts**:
   ```splunk
   index=harmony-assistant level=error
   | stats count by message
   | sort -count
   ```

### Cloud Logging (GCP, AWS, Azure)

For cloud deployments, configure structured logging to send to cloud logging services:

```javascript
// Cloud logging integration example
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('harmony-assistant');

export function sendToCloudLogging(logEntry) {
  const metadata = {
    resource: { type: 'cloud_function' },
    severity: logEntry.level.toUpperCase()
  };
  
  const entry = log.entry(metadata, logEntry);
  log.write(entry);
}
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Error Rates**
   - Application errors per minute
   - AI service error rates
   - Database connection errors

2. **Performance Metrics**
   - Average response time
   - P95/P99 response times
   - Database query performance

3. **Business Metrics**
   - Chat sessions per day
   - Product searches per hour
   - User engagement rates

4. **System Metrics**
   - Memory usage
   - CPU utilization
   - Database connection pool usage

### Alerting Rules

Create alerts for:

```javascript
// High error rate
if (errorRate > 5% in last 5 minutes) {
  alert('High error rate detected');
}

// Slow response times
if (avgResponseTime > 2000ms in last 10 minutes) {
  alert('Response time degradation');
}

// AI service failures
if (aiServiceErrors > 10 in last 5 minutes) {
  alert('AI service unavailable');
}
```

### Sample Alert Configurations

#### Datadog
```yaml
name: "High Error Rate - Harmony Assistant"
query: "avg(last_5m):sum:harmony_assistant.errors{*}.as_rate() > 0.05"
message: "High error rate detected in Harmony Assistant"
tags:
  - service:harmony-assistant
  - priority:high
```

#### New Relic
```sql
SELECT rate(count(*), 1 minute) 
FROM Log 
WHERE service = 'harmony-assistant' 
AND level = 'error' 
SINCE 5 minutes ago
```

## Log Analysis Queries

### Common Analysis Patterns

1. **Error Analysis**
   ```sql
   -- Find most common errors
   SELECT message, COUNT(*) as count
   FROM logs 
   WHERE level = 'error' 
   AND timestamp > NOW() - INTERVAL 1 DAY
   GROUP BY message 
   ORDER BY count DESC;
   ```

2. **User Journey Analysis**
   ```sql
   -- Track user session flow
   SELECT correlationId, timestamp, message, data
   FROM logs 
   WHERE correlationId = 'conv_123'
   ORDER BY timestamp;
   ```

3. **Performance Analysis**
   ```sql
   -- Find slow operations
   SELECT operation, AVG(duration) as avg_duration
   FROM logs 
   WHERE eventType = 'response_time'
   GROUP BY operation 
   HAVING avg_duration > 1000;
   ```

## Best Practices

### Logging Best Practices

1. **Use structured logging** - Always use JSON format for machine parsing
2. **Include context** - Add correlation IDs and relevant metadata
3. **Log at appropriate levels** - Don't flood logs with debug info in production
4. **Sanitize sensitive data** - Never log passwords, API keys, or PII
5. **Use meaningful messages** - Write clear, searchable log messages

### Analytics Best Practices

1. **Track user flows** - Monitor complete user journeys, not just individual events
2. **Measure business impact** - Connect technical metrics to business outcomes
3. **Respect privacy** - Follow GDPR and other privacy regulations
4. **Sample high-volume events** - Use sampling for very frequent events
5. **Version your events** - Include schema versions for event evolution

### Performance Considerations

1. **Asynchronous logging** - Don't block request processing for logging
2. **Batch analytics events** - Send events in batches to external services
3. **Use sampling** - Sample high-frequency events to reduce overhead
4. **Monitor logging overhead** - Ensure logging doesn't impact performance

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check `ENABLE_STRUCTURED_LOGGING` environment variable
   - Verify log level configuration
   - Check file permissions for log files

2. **Analytics events not tracking**
   - Verify `ENABLE_CHAT_ANALYTICS` is true
   - Check external service credentials
   - Review network connectivity

3. **High logging overhead**
   - Reduce log level in production
   - Implement sampling for high-frequency events
   - Use asynchronous logging

### Debugging Logging Issues

```javascript
// Debug logging configuration
import { getEnvConfig } from './app/services/environment.server.js';

const config = getEnvConfig();
console.log('Logging configuration:', {
  enableStructuredLogging: config.logging.enableStructuredLogging,
  logLevel: config.logging.logLevel,
  enableChatAnalytics: config.logging.enableChatAnalytics
});
```

## Resources

- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)
- [Google Analytics 4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Mixpanel Developer Documentation](https://developer.mixpanel.com/)
- [Environment Management Guide](./ENVIRONMENT_MANAGEMENT.md)