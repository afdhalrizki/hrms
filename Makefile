.PHONY: dev qa staging prod down ps logs

# Default environment
ENV_FILE=deploy/environments/.env.local

dev:
	docker-compose --env-file deploy/environments/.env.local up -d

qa:
	docker-compose --env-file deploy/environments/.env.qa up -d

staging:
	docker-compose --env-file deploy/environments/.env.staging up -d

prod:
	docker-compose --env-file deploy/environments/.env.production up -d

down:
	docker-compose --env-file $(ENV_FILE) down

ps:
	docker-compose --env-file $(ENV_FILE) ps

logs:
	docker-compose --env-file $(ENV_FILE) logs -f

# --- Universal Test Suite (Windows/Mac/Ubuntu) ---
test:
	node scripts/test_runner.mjs

test-all:
	node scripts/test_runner.mjs

test-skip-mobile:
	node scripts/test_runner.mjs --skip-mobile
