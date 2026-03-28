.PHONY: dev qa staging prod down ps logs

# Default environment
ENV_FILE=environments/.env.local

dev:
	docker-compose --env-file environments/.env.local up -d

qa:
	docker-compose --env-file environments/.env.qa up -d

staging:
	docker-compose --env-file environments/.env.staging up -d

prod:
	docker-compose --env-file environments/.env.production up -d

down:
	docker-compose --env-file $(ENV_FILE) down

ps:
	docker-compose --env-file $(ENV_FILE) ps

logs:
	docker-compose --env-file $(ENV_FILE) logs -f
