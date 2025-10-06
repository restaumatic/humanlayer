.PHONY: help install dev build start test lint format format-check check clean migrate

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Start development server
	npm run dev

build: ## Build production bundle
	npm run build

start: ## Start production server
	npm start

test: ## Run tests
	@if [ -n "$$VERBOSE" ]; then \
		npm test; \
	else \
		npm test -- --reporter=dot 2>&1 || true; \
	fi

lint: ## Run ESLint
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

check: ## Run all quality checks
	@if [ -n "$$VERBOSE" ]; then \
		$(MAKE) format-check lint && npx tsc --noEmit; \
	else \
		echo "  humanlayer-api checks..."; \
		npm run format:check >/dev/null 2>&1 && echo "    ✓ Format check passed" || echo "    ✗ Format check failed"; \
		npm run lint >/dev/null 2>&1 && echo "    ✓ Lint check passed" || echo "    ✗ Lint check failed"; \
		npx tsc --noEmit >/dev/null 2>&1 && echo "    ✓ Type checking passed" || echo "    ✗ Type checking failed"; \
	fi

migrate: ## Run database migrations
	npm run migrate

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/
	rm -rf data/humanlayer.db*

.DEFAULT_GOAL := help
