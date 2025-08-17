#!/bin/bash

set -euo pipefail

echo "🚀 Starting deployment to staging..."

# === CONFIGURATION ===
APP_NAME="our-heritage"
REGISTRY="ghcr.io/your-org"
FRONTEND_IMAGE="$REGISTRY/${APP_NAME}-frontend:staging"
BACKEND_IMAGE="$REGISTRY/${APP_NAME}-backend:staging"
DOCKER_COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"

# === AUTH (Optional) ===
echo "🔑 Logging into container registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin

# === BUILD IMAGES ===
echo "🧱 Building backend image..."
docker build -f backend/Dockerfile.prod -t $BACKEND_IMAGE ./backend

echo "🧱 Building frontend image..."
docker build -f frontend/Dockerfile.prod -t $FRONTEND_IMAGE ./frontend

# === PUSH IMAGES ===
echo "📦 Pushing backend image..."
docker push $BACKEND_IMAGE

echo "📦 Pushing frontend image..."
docker push $FRONTEND_IMAGE

# === DEPLOY ON STAGING SERVER ===
echo "🔁 Deploying containers on staging..."

ssh youruser@staging.server.com << EOF
  cd /srv/${APP_NAME}
  
  echo "📥 Pulling latest images..."
  docker pull $BACKEND_IMAGE
  docker pull $FRONTEND_IMAGE

  echo "📄 Using env file: ${ENV_FILE}"
  export $(cat ${ENV_FILE} | xargs)

  echo "🧹 Stopping existing containers..."
  docker compose -f ${DOCKER_COMPOSE_FILE} down

  echo "🆕 Starting new containers..."
  docker compose -f ${DOCKER_COMPOSE_FILE} up -d

  echo "✅ Deployment complete on staging server."
EOF

echo "✅ Staging deployment finished!"
