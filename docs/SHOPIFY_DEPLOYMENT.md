# Shopify Deployment Guide

This guide covers the complete Shopify app deployment process, best practices, and rollback strategies for the Harmony Assistant application.

## Overview

The Harmony Assistant is a Shopify app that requires proper deployment procedures to ensure reliability and security. This guide covers:
- Pre-deployment preparation
- Automated deployment process
- Manual deployment steps
- Rollback strategies
- Monitoring and maintenance

## Prerequisites

### Development Environment Setup

1. **Shopify CLI Installation**
   ```bash
   npm install -g @shopify/cli @shopify/theme
   ```

2. **Shopify Partner Account**
   - Create a Partner account at https://partners.shopify.com
   - Create development, staging, and production apps

3. **Environment Configuration**
   - Follow the [Environment Management Guide](./ENVIRONMENT_MANAGEMENT.md)
   - Ensure all required environment variables are set

### App Configuration

1. **Update `shopify.app.toml`**
   ```toml
   # Learn more about configuring your app at https://shopify.dev/docs/apps/tools/cli/configuration
   
   client_id = "your_app_client_id"
   name = "Harmony-assistant"
   handle = "harmony-assistant"
   application_url = "https://your-production-url.com/"
   embedded = true
   
   [build]
   automatically_update_urls_on_dev = false
   include_config_on_deploy = true
   
   [webhooks]
   api_version = "2025-07"
   
   [access_scopes]
   scopes = "customer_read_customers,customer_read_orders,customer_read_store_credit_account_transactions,customer_read_store_credit_accounts,unauthenticated_read_product_listings"
   
   [auth]
   redirect_urls = [ "https://your-production-url.com/api/auth" ]
   
   [pos]
   embedded = false
   ```

## Deployment Process

### Automated Deployment (Recommended)

1. **Using Shopify CLI Deploy Command**
   ```bash
   # Deploy to staging
   npm run deploy -- --env=staging
   
   # Deploy to production
   npm run deploy -- --env=production
   ```

2. **GitHub Actions Deployment** (Create `.github/workflows/deploy.yml`)
   ```yaml
   name: Deploy to Shopify
   
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   
   jobs:
     deploy-staging:
       if: github.ref == 'refs/heads/develop'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - run: npm run deploy
           env:
             SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY_STAGING }}
             SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET_STAGING }}
   
     deploy-production:
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       needs: [tests]
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
         - run: npm run deploy
           env:
             SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY_PROD }}
             SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET_PROD }}
   ```

### Manual Deployment Steps

1. **Pre-deployment Checklist**
   - [ ] All tests pass
   - [ ] Environment variables configured
   - [ ] Database migrations ready
   - [ ] Build process successful
   - [ ] Dependencies updated and secure

2. **Build and Test**
   ```bash
   # Install dependencies
   npm ci
   
   # Run linting
   npm run lint
   
   # Build application
   npm run build
   
   # Run tests (if available)
   npm test
   ```

3. **Database Preparation**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate deploy
   ```

4. **Deploy to Shopify**
   ```bash
   # Configure environment
   shopify app config use production
   
   # Deploy the app
   shopify app deploy
   ```

5. **Post-deployment Verification**
   - [ ] App loads successfully
   - [ ] Authentication works
   - [ ] Core features functional
   - [ ] Database connectivity verified
   - [ ] Logs show no errors

## Environment-Specific Deployments

### Development Deployment

```bash
# Start development server
npm run dev

# This will:
# - Start Remix in development mode
# - Create ngrok tunnel
# - Provide preview URL for installation
```

### Staging Deployment

```bash
# Set staging configuration
shopify app config use staging

# Deploy to staging
shopify app deploy

# Verify staging deployment
curl -f https://your-staging-app.onrender.com/health
```

### Production Deployment

```bash
# Set production configuration  
shopify app config use production

# Deploy to production
shopify app deploy

# Monitor deployment
tail -f /var/log/app.log
```

## Rollback Strategies

### Quick Rollback (Emergency)

1. **Revert to Previous Version**
   ```bash
   # Get previous deployment version
   shopify app versions list
   
   # Rollback to specific version
   shopify app deploy --version=previous_version_id
   ```

2. **Database Rollback**
   ```bash
   # If database changes were made, rollback migrations
   npx prisma migrate reset --force
   npx prisma migrate deploy --to=previous_migration
   ```

### Planned Rollback

1. **Create Rollback Plan**
   - Document changes being rolled back
   - Identify dependencies
   - Plan communication to users

2. **Execute Rollback**
   ```bash
   # Switch to previous stable branch
   git checkout production-stable
   
   # Deploy previous version
   shopify app deploy
   
   # Verify rollback successful
   npm run verify-deployment
   ```

### Blue-Green Deployment (Advanced)

For zero-downtime deployments:

1. **Deploy to Green Environment**
   ```bash
   # Deploy new version to staging/green environment
   shopify app deploy --env=green
   ```

2. **Test Green Environment**
   - Run automated tests
   - Manual verification
   - Performance testing

3. **Switch Traffic**
   ```bash
   # Update DNS/load balancer to point to green
   # Or update Shopify app URLs
   ```

4. **Monitor and Rollback if Needed**
   ```bash
   # If issues detected, switch back to blue
   # Update URLs back to previous environment
   ```

## Monitoring and Maintenance

### Health Checks

Create a health check endpoint:

```javascript
// app/routes/health.js
export async function loader() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check external API connectivity
    // Add other health checks
    
    return json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION 
    });
  } catch (error) {
    throw new Response('Unhealthy', { status: 500 });
  }
}
```

### Deployment Scripts

Create deployment helper scripts:

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENV=${1:-staging}

echo "Deploying to $ENV environment..."

# Pre-deployment checks
npm run lint
npm run build

# Set environment
shopify app config use $ENV

# Deploy
shopify app deploy

# Post-deployment verification
sleep 10
curl -f "https://your-app-$ENV.com/health"

echo "Deployment to $ENV completed successfully!"
```

### Monitoring Setup

1. **Application Monitoring**
   - Set up error tracking (Sentry, Bugsnag)
   - Performance monitoring (New Relic, DataDog)
   - Uptime monitoring (UptimeRobot, Pingdom)

2. **Log Aggregation**
   - Use structured logging (implemented in logger.server.js)
   - Centralized log collection (ELK stack, Splunk)
   - Alert on error patterns

3. **Performance Metrics**
   - Response time monitoring
   - Database query performance
   - API rate limit tracking

## Best Practices

### Security

- [ ] Never commit secrets to version control
- [ ] Use environment variables for all configuration
- [ ] Regularly rotate API keys and secrets
- [ ] Enable HTTPS for all environments
- [ ] Implement proper authentication and authorization

### Testing

- [ ] Automated testing in CI/CD pipeline
- [ ] Integration tests for Shopify APIs
- [ ] Load testing for performance validation
- [ ] Security scanning for vulnerabilities

### Documentation

- [ ] Document all deployment procedures
- [ ] Maintain runbook for common issues
- [ ] Keep dependency updates documented
- [ ] Document rollback procedures

### Performance

- [ ] Monitor deployment time
- [ ] Optimize build process
- [ ] Use caching strategies
- [ ] Monitor resource usage

## Troubleshooting

### Common Deployment Issues

1. **Authentication Failures**
   ```bash
   # Re-authenticate with Shopify CLI
   shopify auth logout
   shopify auth login
   ```

2. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Database Migration Issues**
   ```bash
   # Reset and re-run migrations
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

4. **Environment Variable Issues**
   ```bash
   # Verify environment variables are set
   npm run env:check
   ```

### Rollback Scenarios

1. **Critical Bug in Production**
   - Immediate rollback to previous stable version
   - Communicate issue to stakeholders
   - Fix issue in development
   - Re-deploy with fix

2. **Performance Degradation**
   - Monitor system metrics
   - Identify bottlenecks
   - Rollback if necessary
   - Optimize and re-deploy

3. **Third-party API Issues**
   - Check external service status
   - Implement fallback mechanisms
   - Update service configurations

## Support and Resources

- [Shopify App Deployment Documentation](https://shopify.dev/docs/apps/deployment)
- [Shopify CLI Reference](https://shopify.dev/docs/apps/tools/cli)
- [Environment Management Guide](./ENVIRONMENT_MANAGEMENT.md)
- [Analytics and Logging Guide](./ANALYTICS_LOGGING.md)