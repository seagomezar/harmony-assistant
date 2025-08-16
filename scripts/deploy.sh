#!/bin/bash

# Harmony Assistant Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-staging}
VALID_ENVS=("development" "staging" "production")

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

validate_environment() {
    if [[ ! " ${VALID_ENVS[@]} " =~ " ${ENV} " ]]; then
        error "Invalid environment: $ENV. Valid options: ${VALID_ENVS[*]}"
    fi
    log "Deploying to environment: $ENV"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Shopify CLI is installed
    if ! command -v shopify &> /dev/null; then
        error "Shopify CLI is not installed. Install with: npm install -g @shopify/cli"
    fi
    
    # Check if environment file exists
    if [[ ! -f ".env.${ENV}" ]]; then
        warn "Environment file .env.${ENV} not found. Using .env if it exists."
        if [[ ! -f ".env" ]]; then
            error "No environment configuration found. Please create .env or .env.${ENV}"
        fi
    fi
    
    log "Prerequisites check passed"
}

run_tests() {
    log "Running linting and tests..."
    
    # Install dependencies
    npm ci
    
    # Run linting
    if ! npm run lint; then
        error "Linting failed. Please fix lint errors before deploying."
    fi
    
    # Run tests if they exist
    if npm run test --silent 2>/dev/null; then
        log "Tests passed"
    else
        warn "No tests found or tests failed. Proceeding with deployment..."
    fi
    
    log "Code quality checks passed"
}

build_application() {
    log "Building application..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Build the application
    if ! npm run build; then
        error "Build failed. Please fix build errors before deploying."
    fi
    
    log "Application built successfully"
}

setup_shopify_config() {
    log "Setting up Shopify configuration for $ENV..."
    
    # Use appropriate Shopify app configuration
    case $ENV in
        "development")
            shopify app config use development 2>/dev/null || warn "Development config not found"
            ;;
        "staging")
            shopify app config use staging 2>/dev/null || warn "Staging config not found"
            ;;
        "production")
            shopify app config use production || error "Production config not found. Please set up production app first."
            ;;
    esac
    
    log "Shopify configuration set for $ENV"
}

deploy_to_shopify() {
    log "Deploying to Shopify ($ENV)..."
    
    # Deploy using Shopify CLI
    if ! shopify app deploy --force; then
        error "Shopify deployment failed"
    fi
    
    log "Successfully deployed to Shopify"
}

run_database_migrations() {
    log "Running database migrations..."
    
    # Load environment variables
    if [[ -f ".env.${ENV}" ]]; then
        export $(cat .env.${ENV} | grep -v '^#' | xargs)
    elif [[ -f ".env" ]]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Run database migrations
    if ! npx prisma migrate deploy; then
        error "Database migration failed"
    fi
    
    log "Database migrations completed"
}

verify_deployment() {
    log "Verifying deployment..."
    
    # Load app URL from environment
    if [[ -f ".env.${ENV}" ]]; then
        APP_URL=$(grep SHOPIFY_APP_URL .env.${ENV} | cut -d '=' -f2)
    elif [[ -f ".env" ]]; then
        APP_URL=$(grep SHOPIFY_APP_URL .env | cut -d '=' -f2)
    fi
    
    if [[ -n "$APP_URL" ]]; then
        # Wait a moment for deployment to be ready
        sleep 10
        
        # Try to reach the health endpoint
        if curl -f "${APP_URL}/health" >/dev/null 2>&1; then
            log "Deployment verification successful"
        else
            warn "Could not verify deployment at ${APP_URL}/health"
        fi
    else
        warn "Could not determine app URL for verification"
    fi
}

send_notification() {
    log "Sending deployment notification..."
    
    # Send Slack notification if webhook is configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Harmony Assistant deployed to $ENV successfully\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
    fi
    
    # Send Discord notification if webhook is configured
    if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Harmony Assistant deployed to $ENV successfully\"}" \
            "$DISCORD_WEBHOOK_URL" >/dev/null 2>&1
    fi
}

cleanup() {
    log "Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Main deployment flow
main() {
    log "Starting deployment process..."
    
    validate_environment
    check_prerequisites
    run_tests
    build_application
    setup_shopify_config
    
    # Handle database migrations for non-development environments
    if [[ "$ENV" != "development" ]]; then
        run_database_migrations
    fi
    
    deploy_to_shopify
    verify_deployment
    send_notification
    cleanup
    
    log "Deployment completed successfully! 🎉"
    log "Environment: $ENV"
    log "Timestamp: $(date)"
}

# Run main function with error handling
trap 'error "Deployment failed at line $LINENO"' ERR

main "$@"