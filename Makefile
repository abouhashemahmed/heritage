# Makefile

# Configuration
APP_FRONTEND := ./apps/frontend
APP_BACKEND := ./apps/backend
DEPLOY_SCRIPT := scripts/deploy-staging.sh
PNPM := pnpm

.PHONY: all build dev deploy-staging lint seed clean help

all: build ## Build all projects (default)

##@ Development

build: ## Build frontend application
	@echo "🚀 Building frontend..."
	$(PNPM) build --filter $(APP_FRONTEND)

dev: ## Start development server
	@echo "💻 Starting development environment..."
	$(PNPM) dev --filter $(APP_FRONTEND)

##@ Deployment

deploy-staging: build ## Deploy to staging environment
	@echo "🚢 Deploying to staging..."
	@if [ -f $(DEPLOY_SCRIPT) ]; then \
		bash $(DEPLOY_SCRIPT); \
	else \
		echo "❌ Error: Deploy script not found"; exit 1; \
	fi

##@ Code Quality

lint: ## Run linting across all projects
	@echo "🔍 Linting code..."
	$(PNPM) lint

##@ Database

seed: ## Seed database with test data
	@echo "🌱 Seeding database..."
	$(PNPM) --filter $(APP_BACKEND) exec prisma db seed

##@ Utilities

clean: ## Remove build artifacts and node_modules
	@echo "🧹 Cleaning up..."
	rm -rf node_modules
	$(PNPM) store prune

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
