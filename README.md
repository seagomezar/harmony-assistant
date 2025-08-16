# Build an AI Agent for Your Storefront

A Shopify template app that lets you embed an AI-powered chat widget on your storefront. Shoppers can search for products, ask about policies or shipping, and complete purchases - all without leaving the conversation. Under the hood it speaks the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) to tap into Shopify’s APIs.

### Overview
- **What it is**: A chat widget + backend that turns any storefront into an AI shopping assistant.
- **Key features**:
  - Natural-language product discovery
  - Store policy & FAQ lookup
  - Create carts, add or remove items, and initiate checkout
  - Track orders and initiate returns

## Developer Docs
- Everything from installation to deep dives lives on https://shopify.dev/docs/apps/build/storefront-mcp.
- Clone this repo and follow the instructions on the dev docs.

## Examples
- `hi` > will return a LLM based response. Note that you can customize the LLM call with your own prompt.
- `can you search for snowboards` > will use the `search_shop_catalog` MCP tool.
- `add The Videographer Snowboard to my cart` > will use the `update_cart` MCP tool and offer a checkout URL.
- `update my cart to make that 2 items please` > will use the `update_cart` MCP tool.
- `can you tell me what is in my cart` > will use the `get_cart` MCP tool.
- `what languages is your store available in?` > will use the `search_shop_policies_and_faqs` MCP tool.
- `I'd like to checkout` > will call checkout from one of the above MCP cart tools.
- `Show me my recent orders` > will use the `get_most_recent_order_status` MCP tool.
- `Can you give me more details about order Id 1` > will use the `get_order_status` MCP tool.

## Architecture

### Components
This app consists of two main components:

1. **Backend**: A Remix app server that handles communication with Claude, processes chat messages, and acts as an MCP Client.
2. **Chat UI**: A Shopify theme extension that provides the customer-facing chat interface.

When you start the app, it will:
- Start Remix in development mode.
- Tunnel your local server so Shopify can reach it.
- Provide a preview URL to install the app on your development store.

For direct testing, point your test suite at the `/chat` endpoint (GET or POST for streaming).

### MCP Tools Integration
- The backend already initializes all Shopify MCP tools—see [`app/mcp-client.js`](./app/mcp-client.js).
- These tools let your LLM invoke product search, cart actions, order lookups, etc.
- More in our [dev docs](https://shopify.dev/docs/apps/build/storefront-mcp).

### Tech Stack
- **Framework**: [Remix](https://remix.run/)
- **AI**: [Claude by Anthropic](https://www.anthropic.com/claude)
- **Shopify Integration**: [@shopify/shopify-app-remix](https://www.npmjs.com/package/@shopify/shopify-app-remix)
- **Database**: SQLite (via Prisma) for session storage

## Customizations
This repo can be customized. You can:
- Edit the prompt
- Change the chat widget UI
- Swap out the LLM

You can learn how from our [dev docs](https://shopify.dev/docs/apps/build/storefront-mcp).

## Deployment

### Quick Start

1. **Environment Setup**
   ```bash
   # Set up your environment (development/staging/production)
   ./scripts/setup-env.sh development
   
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

2. **Production Deployment**
   ```bash
   # Deploy to staging
   ./scripts/deploy.sh staging
   
   # Deploy to production
   ./scripts/deploy.sh production
   ```

### Deployment Options

- **Shopify App Store**: Follow the [Shopify Deployment Guide](./docs/SHOPIFY_DEPLOYMENT.md)
- **Render.com**: Follow the [Render Deployment Guide](./docs/RENDER_DEPLOYMENT.md)
- **Custom Infrastructure**: Use the provided Docker configuration

### Environment Management

The application supports multiple environments with proper configuration management:

- **Development**: Local development with ngrok tunneling
- **Staging**: Pre-production testing environment  
- **Production**: Live application

See the [Environment Management Guide](./docs/ENVIRONMENT_MANAGEMENT.md) for detailed setup instructions.

## Analytics and Logging

The application includes comprehensive logging and analytics:

- **Structured JSON logging** for machine parsing
- **Event tracking** for user interactions and business metrics
- **Performance monitoring** for response times and bottlenecks
- **Error tracking** with detailed stack traces
- **Analytics integration** with Google Analytics, Mixpanel, and custom services

See the [Analytics and Logging Guide](./docs/ANALYTICS_LOGGING.md) for implementation details.

## Documentation

### Setup and Deployment
- [Environment Management Guide](./docs/ENVIRONMENT_MANAGEMENT.md) - Environment variables and configuration
- [Shopify Deployment Guide](./docs/SHOPIFY_DEPLOYMENT.md) - Shopify app deployment process
- [Render Deployment Guide](./docs/RENDER_DEPLOYMENT.md) - Render.com deployment instructions
- [Analytics and Logging Guide](./docs/ANALYTICS_LOGGING.md) - Structured logging and analytics

### Scripts
- `./scripts/setup-env.sh` - Environment setup automation
- `./scripts/deploy.sh` - Automated deployment script

### CI/CD
- GitHub Actions workflow for automated testing and deployment
- Environment-specific deployments (staging/production)
- Security scanning and code quality checks

Follow standard Shopify app deployment procedures as outlined in the [Shopify documentation](https://shopify.dev/docs/apps/deployment/web).

## Contributing
We appreciate your interest in contributing to this project. As this is an example repository intended for educational and reference purposes, we are not accepting contributions.
