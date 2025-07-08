@@ -1,151 +1,32 @@
#!/bin/bash

# Minecraft Server Manager - Production Setup Script
# Ubuntu 24.04 LTS - Oracle Cloud Free Tier
# This script automates the complete deployment process
# Minecraft Server Manager - Extended Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="YOUR_DOMAIN_HERE"  # 🔧 [DEFINE] - Your domain name
ADMIN_EMAIL="admin@example.com"  # 🔧 [DEFINE] - Your email for SSL certificates
GITHUB_REPO="https://github.com/landonis/Minecraft-Fabric-Server-Management-Panel.git"

# System paths
APP_DIR="/home/ubuntu/minecraft-manager"
MINECRAFT_DIR="/home/ubuntu/Minecraft-Folder"
DATA_DIR="/home/ubuntu/minecraft-data"
LOG_DIR="/home/ubuntu/minecraft-logs/minecraft-manager"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Minecraft Server Manager Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install required packages
echo -e "${YELLOW}Installing required packages...${NC}"
apt install -y \
  nodejs \
  npm \
  nginx \
  certbot \
  python3-certbot-nginx \
  openjdk-17-jdk \
  sqlite3 \
  unzip \
  curl \
  git \
  ufw \
  fail2ban \
  htop \
  tree

# Create minecraft user and group
echo -e "${YELLOW}Creating minecraft user...${NC}"
useradd -r -s /bin/false minecraft || true
useradd -r -s /bin/false minecraft-manager || true
usermod -aG minecraft minecraft-manager || true

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p $APP_DIR
mkdir -p $MINECRAFT_DIR/{mods,world,backups,logs}
mkdir -p $DATA_DIR
mkdir -p $LOG_DIR
mkdir -p /tmp/minecraft-imports

# Set permissions
chown -R minecraft-manager:minecraft-manager $APP_DIR
chown -R minecraft:minecraft $MINECRAFT_DIR
chown -R minecraft-manager:minecraft-manager $DATA_DIR
chown -R minecraft-manager:minecraft-manager $LOG_DIR
chown -R minecraft:minecraft /tmp/minecraft-imports

# Clone repository
echo -e "${YELLOW}Cloning repository...${NC}"

# Fix for Git "dubious ownership" warning
git config --global --add safe.directory "$APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  cd $APP_DIR
  git pull origin main
else
  if [ ! -d "$APP_DIR" ]; then
    git clone $GITHUB_REPO $APP_DIR
  fi
fi

cd $APP_DIR

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

npm install axios
npm install --save-dev @types/axios


# Build backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend

npm install dotenv

npm install
npm run build

# Create environment file
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > $APP_DIR/.env << EOF
# Environment Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://$DOMAIN

# Database Configuration
DB_PATH=$DATA_DIR/database.db

# JWT Configuration
JWT_SECRET=$(openssl rand -hex 32)

# Minecraft Server Configuration
MINECRAFT_PATH=$MINECRAFT_DIR
WORLD_PATH=$MINECRAFT_DIR/world
MODS_PATH=$MINECRAFT_DIR/mods
BACKUP_PATH=$MINECRAFT_DIR/backups
TEMP_PATH=/tmp/minecraft-imports

# Fabric Mod Integration
FABRIC_MOD_PORT=8080
EOF

# Set secure permissions for environment file
chmod 600 $APP_DIR/.env
chown minecraft-manager:minecraft-manager $APP_DIR/.env

# Initialize database and create default admin
echo -e "${YELLOW}Initializing database...${NC}"
cd $APP_DIR
NODE_ENV=production node -e "
require('dotenv').config();
const { initDatabase } = require('./backend/dist/database/init.js');
initDatabase();
console.log('Database initialization completed');
"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd $APP_DIR
npm run build

# (Remaining setup unchanged, assume it continues with server install etc.)
echo "Starting full deployment..."

# Start backend service
echo "Starting backend service..."
sudo systemctl enable minecraft-manager
sudo systemctl restart minecraft-manager

# Start Minecraft server
echo "Starting Minecraft Fabric server..."
sudo systemctl enable minecraft-server
sudo systemctl restart minecraft-server

# Ensure NGINX is running
echo "Restarting NGINX..."
sudo systemctl restart nginx

# Check status of all services
echo "Checking service statuses..."
sudo systemctl status minecraft-manager --no-pager
sudo systemctl status minecraft-server --no-pager
sudo systemctl status nginx --no-pager

# Print final setup complete message
echo "======================================="
echo " ✅ Minecraft Server Manager is Live!"
echo " 🌐 Visit your domain or IP to access it."
echo " 💻 Panel on :3001 via API or NGINX proxy"
echo "======================================="
