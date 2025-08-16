# Environment Management Guide

This guide explains how to properly manage environment variables and configurations for the Harmony Assistant application across different environments.

## Overview

The application uses a structured approach to environment management with:
- Environment-specific configuration files
- Automatic validation of required variables
- Type-safe configuration access
- Secure handling of sensitive data

## Environment Files

### Template Files

1. **`.env.example`** - Main template with all possible variables documented
2. **`.env.development`** - Development environment template
3. **`.env.staging`** - Staging environment template  
4. **`.env.production`** - Production environment template

### Setting Up Your Environment

1. **For Development:**
   ```bash
   cp .env.development .env
   # Edit .env with your actual values
   ```

2. **For Staging:**
   ```bash
   cp .env.staging .env
   # Edit .env with your staging values
   ```

3. **For Production:**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

## Required Environment Variables

### Core Requirements (All Environments)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment type | `development`, `staging`, `production` |
| `SHOPIFY_API_KEY` | Shopify app client ID | From Partner Dashboard |
| `SHOPIFY_API_SECRET` | Shopify app client secret | From Partner Dashboard |
| `SHOPIFY_APP_URL` | Public URL of your app | `https://your-app.com` |
| `CLAUDE_API_KEY` | Claude AI API key | From Anthropic console |
| `DATABASE_URL` | Database connection string | `file:./dev.db` or PostgreSQL URL |
| `REDIRECT_URL` | OAuth redirect URL | `${SHOPIFY_APP_URL}/auth/callback` |

### Environment-Specific Requirements

#### Development
- `HMR_SERVER_PORT` - Hot module replacement port (default: 8002)

#### Production & Staging
- `SESSION_SECRET` - Strong random string for session encryption
- `RENDER_SERVICE_NAME` - Service name for Render deployment

## Configuration Access

### Using the Environment Service

```javascript
import { getEnvConfig, isEnvironment } from './app/services/environment.server.js';

// Get typed configuration
const config = getEnvConfig();

// Access specific values
const shopifyConfig = config.shopify;
const aiProvider = config.ai.provider;

// Environment checks
if (isEnvironment('production')) {
  // Production-specific logic
}
```

### Configuration Structure

The configuration is organized into logical sections:

```javascript
{
  // Environment info
  nodeEnv: 'development',
  port: 3000,
  isDevelopment: true,
  isProduction: false,
  isStaging: false,

  // Shopify integration
  shopify: {
    apiKey: 'your_api_key',
    apiSecret: 'your_secret',
    appUrl: 'https://your-app.com',
    scopes: ['customer_read_customers', ...],
    customDomain: 'optional-custom-domain.myshopify.com'
  },

  // AI services
  ai: {
    provider: 'claude',
    claudeApiKey: 'your_claude_key',
    geminiApiKey: 'your_gemini_key'
  },

  // Database
  database: {
    url: 'postgresql://...'
  },

  // Authentication
  auth: {
    redirectUrl: 'https://your-app.com/auth/callback',
    sessionSecret: 'your_session_secret'
  },

  // Deployment
  deployment: {
    renderServiceName: 'harmony-assistant',
    hmrServerPort: 8002,
    frontendPort: 8002
  },

  // Logging & Analytics
  logging: {
    enableStructuredLogging: true,
    logLevel: 'info',
    enableChatAnalytics: true,
    enablePerformanceMonitoring: true
  },

  // Analytics integrations
  analytics: {
    enabled: false,
    googleAnalyticsId: 'G-XXXXXXXXXX',
    mixpanelToken: 'your_token'
  }
}
```

## Security Best Practices

### 1. Never Commit Secrets
- Add `.env*` to `.gitignore` (except templates)
- Use environment variables for all sensitive data
- Rotate secrets regularly

### 2. Environment Isolation
- Use different API keys for each environment
- Separate database instances
- Different Shopify apps for each environment

### 3. Access Control
- Limit who has access to production environment variables
- Use secure secret management services in production
- Document who has access to what

## Environment Validation

The application automatically validates required environment variables on startup:

```javascript
// This happens automatically when the app starts
import envConfig from './app/services/environment.server.js';

// Will throw an error if required variables are missing
// Error message will list all missing variables
```

### Custom Validation

Add custom validation for your specific needs:

```javascript
import { getEnvVar } from './app/services/environment.server.js';

// Get required variable (throws if missing)
const apiKey = getEnvVar('MY_REQUIRED_API_KEY');

// Get optional variable with default
const timeout = getEnvVar('API_TIMEOUT', '5000');
```

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Error: "Missing required environment variables: ..."
   - Solution: Check the error message and add missing variables to `.env`

2. **Invalid Environment Values**
   - Error: Port or other numeric values not working
   - Solution: Ensure numeric values are valid numbers

3. **Database Connection Issues**
   - Error: "Can't connect to database"
   - Solution: Verify `DATABASE_URL` is correct for your environment

### Development Setup Checklist

- [ ] Copy appropriate `.env.*` template to `.env`
- [ ] Fill in all required variables
- [ ] Set up Shopify development app
- [ ] Get Claude API key from Anthropic
- [ ] Set up database (SQLite for dev, PostgreSQL for staging/prod)
- [ ] Configure ngrok or similar tunnel for development
- [ ] Test the application starts without errors

### Staging Setup Checklist

- [ ] Create staging Shopify app
- [ ] Set up staging database
- [ ] Deploy to staging environment (Render, etc.)
- [ ] Configure staging domain
- [ ] Test with staging data
- [ ] Verify analytics and logging work

### Production Setup Checklist

- [ ] Create production Shopify app
- [ ] Set up production database with backups
- [ ] Generate strong session secrets
- [ ] Configure production domain and SSL
- [ ] Set up monitoring and alerts
- [ ] Test deployment process
- [ ] Document rollback procedures
- [ ] Set up log aggregation

## Environment Variables Reference

For a complete list of all available environment variables, see the `.env.example` file. Each variable includes:
- Description of what it does
- Whether it's required or optional
- Example values
- Environment-specific notes