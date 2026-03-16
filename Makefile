.PHONY: dev staging prod down ps logs

# Default environment
ENV_FILE=environments/.env.local

dev:
	docker-compose --env-file environments/.env.local up -d

staging:
	docker-compose --env-file environments/.env.staging up -d

prod:
	docker-compose --env-file environments/.env.production up -d

down:
	docker-compose down

ps:
	docker-compose ps

logs:
	docker-compose logs -f
