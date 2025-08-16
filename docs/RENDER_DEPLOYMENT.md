# Render Deployment Guide

This guide covers deploying the Harmony Assistant application to Render.com, including best practices for scaling, monitoring, and maintaining your deployment.

## Overview

Render.com provides a simple, reliable platform for deploying web applications. This guide covers:
- Initial deployment setup
- Environment configuration
- Scaling strategies
- Monitoring and alerting
- Performance optimization
- Troubleshooting common issues

## Prerequisites

### Render Account Setup

1. **Create Render Account**
   - Sign up at https://render.com
   - Connect your GitHub account
   - Verify your email address

2. **Repository Access**
   - Ensure your repository is public or grant Render access to private repos
   - Repository should be in GitHub, GitLab, or Bitbucket

### Local Development

1. **Test Docker Build**
   ```bash
   # Build and test Docker image locally
   docker build -t harmony-assistant .
   docker run -p 3000:3000 --env-file .env.production harmony-assistant
   ```

2. **Environment Variables**
   - Follow the [Environment Management Guide](./ENVIRONMENT_MANAGEMENT.md)
   - Prepare production environment variables

## Deployment Setup

### 1. Create New Web Service

1. **In Render Dashboard:**
   - Click "New +" → "Web Service"
   - Connect your repository
   - Select the harmony-assistant repository

2. **Basic Configuration:**
   ```yaml
   Name: harmony-assistant-prod
   Environment: Docker
   Region: Oregon (US West) # Choose based on your users
   Branch: main
   Dockerfile Path: ./Dockerfile
   ```

3. **Build & Deploy Settings:**
   ```yaml
   Build Command: # Leave empty (handled by Dockerfile)
   Start Command: # Leave empty (handled by Dockerfile)
   ```

### 2. Environment Variables Configuration

Add these environment variables in Render dashboard:

#### Required Variables
```bash
# Shopify Configuration
SHOPIFY_API_KEY=your_production_api_key
SHOPIFY_API_SECRET=your_production_api_secret
SHOPIFY_APP_URL=https://your-service-name.onrender.com
SCOPES=customer_read_customers,customer_read_orders,customer_read_store_credit_account_transactions,customer_read_store_credit_accounts,unauthenticated_read_product_listings

# AI Service
CLAUDE_API_KEY=your_production_claude_key
AI_PROVIDER=claude

# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Security
SESSION_SECRET=generate_strong_random_string_here
REDIRECT_URL=https://your-service-name.onrender.com/auth/callback

# Environment
NODE_ENV=production
PORT=3000

# Render-specific
RENDER_SERVICE_NAME=harmony-assistant-prod

# Logging
ENABLE_STRUCTURED_LOGGING=true
LOG_LEVEL=info
ENABLE_CHAT_ANALYTICS=true
ENABLE_PERFORMANCE_MONITORING=true
```

#### Optional Analytics Variables
```bash
ANALYTICS_ENABLED=true
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your_mixpanel_token
```

### 3. Database Setup

#### PostgreSQL Database (Recommended)

1. **Create Database Service:**
   - In Render dashboard: "New +" → "PostgreSQL"
   - Choose plan based on your needs:
     - **Starter ($7/month)**: 1GB storage, 1 vCPU
     - **Standard ($20/month)**: 10GB storage, 1 vCPU
     - **Pro ($65/month)**: 25GB storage, 2 vCPU

2. **Database Configuration:**
   ```yaml
   Name: harmony-assistant-db
   Database: harmony_assistant_prod
   User: harmony_user
   Region: Same as web service
   ```

3. **Update DATABASE_URL:**
   ```bash
   # Render provides this automatically
   DATABASE_URL=postgresql://harmony_user:password@hostname:5432/harmony_assistant_prod
   ```

#### Database Migration

Add migration step to your deployment:

```dockerfile
# In Dockerfile, add before CMD
RUN npm run setup
```

Or create a separate script:

```bash
#!/bin/bash
# scripts/migrate.sh
npx prisma generate
npx prisma migrate deploy
```

### 4. Custom Domain (Optional)

1. **Add Custom Domain:**
   - In service settings → "Custom Domains"
   - Add your domain (e.g., `app.yourdomain.com`)

2. **Update DNS:**
   ```
   Type: CNAME
   Name: app (or your subdomain)
   Value: your-service-name.onrender.com
   ```

3. **Update Environment Variables:**
   ```bash
   SHOPIFY_APP_URL=https://app.yourdomain.com
   REDIRECT_URL=https://app.yourdomain.com/auth/callback
   ```

## Scaling Configuration

### Horizontal Scaling

1. **Instance Types:**
   ```yaml
   # Starter (Free tier)
   - 0.1 vCPU, 512MB RAM
   - Spins down after 15 minutes of inactivity
   - Good for: Development, testing
   
   # Starter+ ($7/month)
   - 0.5 vCPU, 512MB RAM
   - Always on
   - Good for: Small production apps
   
   # Standard ($25/month)
   - 1 vCPU, 2GB RAM
   - Good for: Most production apps
   
   # Pro ($85/month)
   - 2 vCPU, 4GB RAM
   - Good for: High-traffic apps
   ```

2. **Auto-scaling Configuration:**
   ```yaml
   # In render.yaml (advanced)
   services:
     - type: web
       name: harmony-assistant
       env: docker
       plan: standard
       scaling:
         minInstances: 1
         maxInstances: 3
         targetCPUPercent: 70
   ```

### Performance Optimization

1. **Docker Image Optimization:**
   ```dockerfile
   # Multi-stage build for smaller images
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production && npm cache clean --force
   
   FROM node:18-alpine AS runtime
   RUN apk add --no-cache openssl
   WORKDIR /app
   COPY --from=builder /app/node_modules ./node_modules
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   CMD ["npm", "run", "docker-start"]
   ```

2. **Memory Management:**
   ```bash
   # In package.json start script
   "docker-start": "node --max-old-space-size=1024 --optimize-for-size ./build/server/index.js"
   ```

## Monitoring and Alerting

### Built-in Monitoring

Render provides built-in monitoring for:
- CPU usage
- Memory usage  
- Response times
- Request rates
- Error rates

### External Monitoring Setup

1. **Health Check Endpoint:**
   ```javascript
   // app/routes/health.jsx
   export async function loader() {
     try {
       // Database connectivity check
       await prisma.$queryRaw`SELECT 1`;
       
       // External API checks
       const healthData = {
         status: 'healthy',
         timestamp: new Date().toISOString(),
         database: 'connected',
         version: process.env.npm_package_version
       };
       
       return json(healthData);
     } catch (error) {
       console.error('Health check failed:', error);
       throw new Response('Service Unhealthy', { status: 500 });
     }
   }
   ```

2. **Uptime Monitoring:**
   - **UptimeRobot**: Free tier monitors every 5 minutes
   - **Pingdom**: More advanced monitoring options
   - **Datadog**: Comprehensive monitoring suite

   Configure to check `https://your-app.onrender.com/health`

3. **Error Tracking:**
   ```javascript
   // Install Sentry for error tracking
   npm install @sentry/remix
   
   // app/entry.server.jsx
   import * as Sentry from "@sentry/remix";
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```

### Alerting Configuration

1. **Render Alerts:**
   - Set up in service settings
   - Email notifications for:
     - Deploy failures
     - Service downtime
     - High resource usage

2. **Custom Alerts:**
   ```javascript
   // Webhook alerts for critical errors
   if (errorCount > threshold) {
     fetch(process.env.SLACK_WEBHOOK_URL, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text: `🚨 High error rate detected in ${process.env.RENDER_SERVICE_NAME}`
       })
     });
   }
   ```

## CI/CD Integration

### Automatic Deployments

1. **GitHub Integration (Default):**
   - Automatic deploys on push to main branch
   - Preview deploys for pull requests
   - Build status in GitHub

2. **Deploy Hooks:**
   ```bash
   # Manual deployment trigger
   curl -X POST https://api.render.com/deploy/srv-XXXXXXXXXX?key=YYYYYYYY
   ```

3. **GitHub Actions Integration:**
   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to Render
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Deploy to Render
           run: |
             curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
   ```

### Build Optimization

1. **Cache Dependencies:**
   ```dockerfile
   # Layer caching for faster builds
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   ```

2. **Build Performance:**
   ```yaml
   # render.yaml
   services:
     - type: web
       name: harmony-assistant
       buildCommand: npm ci && npm run build
       startCommand: npm run docker-start
   ```

## Security Best Practices

### Environment Security

1. **Secrets Management:**
   - Use Render's environment variables (encrypted at rest)
   - Never commit secrets to repository
   - Rotate secrets regularly

2. **Network Security:**
   ```javascript
   // app/entry.server.jsx
   export default function handleRequest(request, responseStatusCode, responseHeaders) {
     // Security headers
     responseHeaders.set("X-Frame-Options", "DENY");
     responseHeaders.set("X-Content-Type-Options", "nosniff");
     responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
     
     // ... rest of handler
   }
   ```

3. **Database Security:**
   - Use connection pooling
   - Enable SSL connections
   - Regular backups

### Application Security

1. **Rate Limiting:**
   ```javascript
   // Implement rate limiting for API endpoints
   import rateLimit from "express-rate-limit";
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   ```

2. **Input Validation:**
   - Validate all user inputs
   - Sanitize data before database operations
   - Use parameterized queries

## Backup and Recovery

### Database Backups

1. **Automated Backups:**
   - Render PostgreSQL includes daily backups
   - Retained for 7 days (Starter) to 30 days (Pro)

2. **Manual Backups:**
   ```bash
   # Create manual backup
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   
   # Restore from backup
   psql $DATABASE_URL < backup-20240115.sql
   ```

### Application Backups

1. **Code Repository:**
   - Git repository serves as code backup
   - Tag releases for easy rollback

2. **Configuration Backup:**
   - Export environment variables
   - Document service configuration

### Disaster Recovery Plan

1. **Recovery Steps:**
   - Restore from latest database backup
   - Deploy from latest stable release
   - Update DNS if necessary
   - Verify all services operational

2. **Recovery Time Objectives:**
   - Target: < 15 minutes for service restoration
   - Database recovery: < 30 minutes
   - Full functionality: < 1 hour

## Troubleshooting

### Common Issues

1. **Build Failures:**
   ```bash
   # Check build logs in Render dashboard
   # Common issues:
   - Missing environment variables
   - Dependency conflicts
   - Dockerfile errors
   ```

2. **Memory Issues:**
   ```bash
   # Monitor memory usage
   # Solutions:
   - Upgrade to higher memory plan
   - Optimize application memory usage
   - Implement garbage collection tuning
   ```

3. **Database Connection Issues:**
   ```bash
   # Check database connectivity
   npx prisma db push --preview-feature
   
   # Common issues:
   - Incorrect DATABASE_URL
   - Connection pool exhaustion
   - Database server downtime
   ```

4. **Performance Issues:**
   ```bash
   # Check service metrics in dashboard
   # Solutions:
   - Scale to higher plan
   - Optimize database queries
   - Implement caching
   - Add CDN for static assets
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Set environment variables
LOG_LEVEL=debug
ENABLE_STRUCTURED_LOGGING=true

# Check logs in Render dashboard
```

### Support Resources

1. **Render Documentation:**
   - https://render.com/docs
   - Service-specific guides
   - Best practices

2. **Community Support:**
   - Render Community Forum
   - Discord server
   - Stack Overflow

3. **Paid Support:**
   - Available for Pro plans and above
   - Priority response times
   - Architecture reviews

## Cost Optimization

### Plan Selection

1. **Development/Testing:**
   - Use free tier for development
   - Starter+ for staging ($7/month)

2. **Production:**
   - Standard plan for most apps ($25/month)
   - Pro plan for high-traffic ($85/month)

3. **Database:**
   - Starter database for small apps ($7/month)
   - Scale based on storage and performance needs

### Resource Optimization

1. **Right-sizing:**
   - Monitor actual resource usage
   - Scale down if consistently under-utilized
   - Scale up if performance suffers

2. **Cost Monitoring:**
   - Set up billing alerts
   - Review monthly usage reports
   - Optimize based on usage patterns

## Migration Guide

### From Other Platforms

1. **From Heroku:**
   - Export environment variables
   - Update DATABASE_URL format
   - Migrate database data

2. **From Vercel/Netlify:**
   - Convert to full-stack deployment
   - Set up database connection
   - Update build configuration

### Zero-Downtime Migration

1. **Preparation:**
   - Set up new Render service
   - Test thoroughly
   - Prepare DNS changes

2. **Migration:**
   - Deploy to Render
   - Run database migration
   - Update DNS to point to Render
   - Monitor for issues

## Resources and References

- [Render Documentation](https://render.com/docs)
- [Remix Deployment Guide](https://remix.run/docs/en/main/guides/deployment)
- [Environment Management Guide](./ENVIRONMENT_MANAGEMENT.md)
- [Shopify Deployment Guide](./SHOPIFY_DEPLOYMENT.md)
- [Analytics and Logging Guide](./ANALYTICS_LOGGING.md)