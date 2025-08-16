#!/bin/bash

# Environment Setup Script
# Usage: ./scripts/setup-env.sh [environment]
# Example: ./scripts/setup-env.sh development

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ENV=${1:-development}
VALID_ENVS=("development" "staging" "production")

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
    log "Setting up environment: $ENV"
}

copy_env_template() {
    local template_file=".env.${ENV}"
    local target_file=".env"
    
    if [[ ! -f "$template_file" ]]; then
        error "Template file $template_file not found"
    fi
    
    if [[ -f "$target_file" ]]; then
        read -p "File $target_file already exists. Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Keeping existing $target_file"
            return
        fi
    fi
    
    cp "$template_file" "$target_file"
    log "Copied $template_file to $target_file"
}

generate_session_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -hex 32
    elif command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    else
        # Fallback to a simple random string (less secure)
        date +%s | sha256sum | base64 | head -c 32
    fi
}

update_env_file() {
    local env_file=".env"
    
    if [[ ! -f "$env_file" ]]; then
        error "Environment file $env_file not found"
    fi
    
    log "Updating environment file with values..."
    
    # Generate session secret if needed
    if grep -q "your-super-secret-session-key-change-this" "$env_file" || grep -q "staging-session-secret-change-this" "$env_file"; then
        local session_secret=$(generate_session_secret)
        sed -i.bak "s/your-super-secret-session-key-change-this/$session_secret/g" "$env_file"
        sed -i.bak "s/staging-session-secret-change-this/$session_secret/g" "$env_file"
        log "Generated new session secret"
    fi
    
    # Prompt for required values
    prompt_for_env_var "SHOPIFY_API_KEY" "Shopify App Client ID"
    prompt_for_env_var "SHOPIFY_API_SECRET" "Shopify App Client Secret"
    prompt_for_env_var "CLAUDE_API_KEY" "Claude API Key"
    
    # Environment-specific prompts
    case $ENV in
        "development")
            prompt_for_env_var "SHOPIFY_APP_URL" "App URL (e.g., https://abc123.ngrok.io)"
            ;;
        "staging"|"production")
            prompt_for_env_var "SHOPIFY_APP_URL" "App URL (e.g., https://your-app.onrender.com)"
            prompt_for_env_var "DATABASE_URL" "Database URL (PostgreSQL)"
            ;;
    esac
    
    # Update REDIRECT_URL based on SHOPIFY_APP_URL
    local app_url=$(grep SHOPIFY_APP_URL "$env_file" | cut -d '=' -f2)
    if [[ -n "$app_url" ]]; then
        sed -i.bak "s|REDIRECT_URL=.*|REDIRECT_URL=${app_url}/auth/callback|" "$env_file"
        log "Updated REDIRECT_URL to ${app_url}/auth/callback"
    fi
    
    # Clean up backup file
    rm -f "${env_file}.bak"
    
    log "Environment file updated successfully"
}

prompt_for_env_var() {
    local var_name=$1
    local description=$2
    local current_value=$(grep "^${var_name}=" .env | cut -d '=' -f2)
    
    echo -n "Enter ${description}"
    if [[ -n "$current_value" && "$current_value" != "YOUR_"* ]]; then
        echo -n " (current: ${current_value:0:10}...)"
    fi
    echo -n ": "
    
    read -r new_value
    
    if [[ -n "$new_value" ]]; then
        sed -i.bak "s|^${var_name}=.*|${var_name}=${new_value}|" .env
        log "Updated $var_name"
    fi
}

validate_env_file() {
    log "Validating environment configuration..."
    
    # Check if Node.js environment validation works
    if node -e "
        require('dotenv').config();
        const { EnvironmentConfig } = require('./app/services/environment.server.js');
        try {
            new EnvironmentConfig();
            console.log('✅ Environment validation passed');
        } catch (error) {
            console.error('❌ Environment validation failed:', error.message);
            process.exit(1);
        }
    " 2>/dev/null; then
        log "Environment validation passed"
    else
        warn "Could not validate environment (Node.js modules not available)"
        warn "Please run 'npm install' and then test manually"
    fi
}

setup_database() {
    if [[ "$ENV" == "development" ]]; then
        log "Setting up development database..."
        
        # Create SQLite database directory if needed
        mkdir -p prisma
        
        # Generate Prisma client and run migrations
        if command -v npx &> /dev/null; then
            npx prisma generate
            npx prisma migrate dev --name init
            log "Development database setup complete"
        else
            warn "npm/npx not available. Please run 'npx prisma migrate dev' manually"
        fi
    else
        log "For $ENV environment, ensure DATABASE_URL points to a PostgreSQL database"
        log "Run database migrations after deployment with: npx prisma migrate deploy"
    fi
}

create_gitignore_entry() {
    local gitignore_file=".gitignore"
    
    # Ensure .env files are in .gitignore
    if ! grep -q "^\.env$" "$gitignore_file" 2>/dev/null; then
        echo "" >> "$gitignore_file"
        echo "# Environment variables" >> "$gitignore_file"
        echo ".env" >> "$gitignore_file"
        echo ".env.local" >> "$gitignore_file"
        log "Added .env files to .gitignore"
    fi
}

show_next_steps() {
    log "Environment setup complete!"
    echo
    echo "Next steps:"
    echo "1. Review and update .env file with your actual values"
    echo "2. Install dependencies: npm install"
    echo "3. Test the application: npm run dev"
    echo
    
    case $ENV in
        "development")
            echo "For development:"
            echo "- Start development server: npm run dev"
            echo "- This will create an ngrok tunnel for Shopify integration"
            ;;
        "staging")
            echo "For staging deployment:"
            echo "- Deploy to staging: ./scripts/deploy.sh staging"
            echo "- Test thoroughly before production deployment"
            ;;
        "production")
            echo "For production deployment:"
            echo "- Ensure all values in .env are production-ready"
            echo "- Deploy to production: ./scripts/deploy.sh production"
            echo "- Monitor deployment and application health"
            ;;
    esac
    
    echo
    echo "Documentation:"
    echo "- Environment Management: docs/ENVIRONMENT_MANAGEMENT.md"
    echo "- Deployment Guide: docs/SHOPIFY_DEPLOYMENT.md"
    echo "- Render Deployment: docs/RENDER_DEPLOYMENT.md"
}

# Main setup flow
main() {
    log "Starting environment setup for $ENV..."
    
    validate_environment
    copy_env_template
    update_env_file
    validate_env_file
    setup_database
    create_gitignore_entry
    show_next_steps
    
    log "Environment setup completed successfully! 🎉"
}

# Make script executable
chmod +x "$0"

main "$@"