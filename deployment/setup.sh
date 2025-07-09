#!/bin/bash

# Minecraft Server Manager - Production Setup Script
# Ubuntu 24.04 LTS - Complete Deployment Automation
# This script can be run multiple times safely (idempotent)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Update these values
DOMAIN="YOUR_DOMAIN_HERE"  # 🔧 [DEFINE] - Your domain name
ADMIN_EMAIL="admin@example.com"  # 🔧 [DEFINE] - Your email for SSL certificates
GITHUB_REPO="https://github.com/landonis/Minecraft-Fabric-Server-Management-Panel.git"

# System paths
APP_DIR="/home/ubuntu/minecraft-manager"
MINECRAFT_DIR="/home/ubuntu/Minecraft"
DATA_DIR="/home/ubuntu/minecraft-data"
LOG_DIR="/var/log/minecraft-manager"
BACKUP_DIR="/home/ubuntu/minecraft-backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Minecraft Server Manager Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^$1.service"
}

# Function to check if user exists
user_exists() {
    id "$1" >/dev/null 2>&1
}

# Update system packages
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
  tree \
  tar \
  wget

# Create users and groups
echo -e "${YELLOW}Creating system users...${NC}"
if ! user_exists "minecraft"; then
    useradd -r -s /bin/false -d /home/ubuntu/Minecraft minecraft
    echo "✅ Created minecraft user"
else
    echo "✅ minecraft user already exists"
fi

if ! user_exists "minecraft-manager"; then
    useradd -r -s /bin/false -d /home/ubuntu/minecraft-manager minecraft-manager
    echo "✅ Created minecraft-manager user"
else
    echo "✅ minecraft-manager user already exists"
fi

# Add minecraft-manager to minecraft group for file access
usermod -aG minecraft minecraft-manager 2>/dev/null || true

# Create directories with proper structure
echo -e "${YELLOW}Creating directory structure...${NC}"
mkdir -p $APP_DIR
mkdir -p $MINECRAFT_DIR/{mods,world,backups,logs}
mkdir -p $DATA_DIR/data
mkdir -p $LOG_DIR
mkdir -p $BACKUP_DIR
mkdir -p /tmp/minecraft-imports

# Set proper ownership and permissions
chown -R minecraft-manager:minecraft-manager $APP_DIR
chown -R minecraft:minecraft $MINECRAFT_DIR
chown -R minecraft-manager:minecraft-manager $DATA_DIR
chown -R minecraft-manager:minecraft-manager $LOG_DIR
chown -R minecraft-manager:minecraft-manager $BACKUP_DIR
chown -R minecraft:minecraft /tmp/minecraft-imports

# Set directory permissions
chmod 755 $APP_DIR
chmod 755 $MINECRAFT_DIR
chmod 755 $DATA_DIR
chmod 755 $LOG_DIR
chmod 755 $BACKUP_DIR
chmod 1777 /tmp/minecraft-imports  # Sticky bit for temp directory

# Clone or update repository
echo -e "${YELLOW}Setting up application code...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository exists, pulling latest changes..."
    cd $APP_DIR
    git pull origin main || echo "Warning: Could not pull latest changes"
else
    echo "Cloning repository..."
    if [ -d "$APP_DIR" ] && [ "$(ls -A $APP_DIR)" ]; then
        echo "Directory not empty, backing up..."
        mv $APP_DIR $APP_DIR.backup.$(date +%s)
    fi
    git clone $GITHUB_REPO $APP_DIR
fi

cd $APP_DIR

# Generate secure JWT secret
echo -e "${YELLOW}Generating security configuration...${NC}"
JWT_SECRET=$(openssl rand -hex 32)

# Create environment file
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > $APP_DIR/.env << EOF
# Environment Configuration - Generated $(date)
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://$DOMAIN

# Database Configuration
DB_PATH=$DATA_DIR/data/database.db

# Security Configuration
JWT_SECRET=$JWT_SECRET

# Minecraft Server Configuration
MINECRAFT_PATH=$MINECRAFT_DIR
WORLD_PATH=$MINECRAFT_DIR/world
MODS_PATH=$MINECRAFT_DIR/mods
BACKUP_PATH=$BACKUP_DIR
TEMP_PATH=/tmp/minecraft-imports

# Fabric Mod Integration
FABRIC_MOD_PORT=8080

# Logging
LOG_LEVEL=info
LOG_DIR=$LOG_DIR
EOF

# Set secure permissions on environment file
chmod 600 $APP_DIR/.env
chown minecraft-manager:minecraft-manager $APP_DIR/.env

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install
npm run build

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd $APP_DIR
npm run build

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
NODE_ENV=production node -e "
const { initDatabase } = require('./backend/dist/database/init.js');
try {
  initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}
"

# Download Minecraft Fabric server if not exists
echo -e "${YELLOW}Setting up Minecraft Fabric server...${NC}"
if [ ! -f "$MINECRAFT_DIR/fabric-server-launch.jar" ]; then
    echo "Downloading Minecraft Fabric server..."
    cd $MINECRAFT_DIR
    
    # Download latest Fabric installer
    FABRIC_VERSION="0.15.3"
    MINECRAFT_VERSION="1.20.1"
    
    wget -O fabric-installer.jar "https://maven.fabricmc.net/net/fabricmc/fabric-installer/$FABRIC_VERSION/fabric-installer-$FABRIC_VERSION.jar"
    
    # Install Fabric server
    java -jar fabric-installer.jar server -mcversion $MINECRAFT_VERSION -downloadMinecraft
    
    # Clean up installer
    rm fabric-installer.jar
    
    # Accept EULA
    echo "eula=true" > eula.txt
    
    # Create basic server.properties
    cat > server.properties << EOF
server-port=25565
gamemode=survival
difficulty=normal
spawn-protection=16
max-players=20
online-mode=true
white-list=false
motd=Minecraft Server managed by Fabric Server Manager
EOF
    
    chown -R minecraft:minecraft $MINECRAFT_DIR
    echo "✅ Minecraft Fabric server installed"
else
    echo "✅ Minecraft Fabric server already exists"
fi

# Create systemd services
echo -e "${YELLOW}Creating systemd services...${NC}"

# Minecraft server service
cat > /etc/systemd/system/minecraft-server.service << EOF
[Unit]
Description=Minecraft Fabric Server
After=network.target

[Service]
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=$MINECRAFT_DIR
ExecStart=/usr/bin/java -Xmx2G -Xms1G -jar fabric-server-launch.jar nogui
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$MINECRAFT_DIR
ReadWritePaths=/tmp/minecraft-imports

[Install]
WantedBy=multi-user.target
EOF

# Minecraft manager service
cat > /etc/systemd/system/minecraft-manager.service << EOF
[Unit]
Description=Minecraft Server Manager Backend
After=network.target

[Service]
Type=simple
User=minecraft-manager
Group=minecraft-manager
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node backend/dist/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
ReadWritePaths=$DATA_DIR
ReadWritePaths=$LOG_DIR
ReadWritePaths=$BACKUP_DIR
ReadWritePaths=/tmp/minecraft-imports

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable services
systemctl daemon-reload
systemctl enable minecraft-server
systemctl enable minecraft-manager

# Configure NGINX
echo -e "${YELLOW}Configuring NGINX...${NC}"
cat > /etc/nginx/sites-available/minecraft-manager << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Serve static files
    location / {
        root $APP_DIR/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Security
    location ~ /\. {
        deny all;
    }
}
EOF

# Enable NGINX site
ln -sf /etc/nginx/sites-available/minecraft-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload NGINX
nginx -t && systemctl reload nginx

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 25565/tcp  # Minecraft server port

# Configure fail2ban
echo -e "${YELLOW}Configuring fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create backup script
echo -e "${YELLOW}Creating backup script...${NC}"
cat > /usr/local/bin/minecraft-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/minecraft-backups"
WORLD_DIR="/home/ubuntu/Minecraft/world"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

if [ -d "$WORLD_DIR" ]; then
    tar -czf "$BACKUP_DIR/world_backup_$DATE.tar.gz" -C "$(dirname $WORLD_DIR)" "$(basename $WORLD_DIR)"
    echo "Backup created: world_backup_$DATE.tar.gz"
    
    # Keep only last 7 backups
    cd $BACKUP_DIR
    ls -t world_backup_*.tar.gz | tail -n +8 | xargs -r rm
else
    echo "World directory not found: $WORLD_DIR"
fi
EOF

chmod +x /usr/local/bin/minecraft-backup.sh

# Create status check script
cat > /usr/local/bin/minecraft-status.sh << 'EOF'
#!/bin/bash
echo "=== Minecraft Server Manager Status ==="
echo "Date: $(date)"
echo ""

echo "🔧 Services Status:"
systemctl is-active --quiet minecraft-server && echo "✅ Minecraft Server: Running" || echo "❌ Minecraft Server: Stopped"
systemctl is-active --quiet minecraft-manager && echo "✅ Manager Backend: Running" || echo "❌ Manager Backend: Stopped"
systemctl is-active --quiet nginx && echo "✅ NGINX: Running" || echo "❌ NGINX: Stopped"

echo ""
echo "📊 System Resources:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"

echo ""
echo "🎮 Minecraft Server:"
if systemctl is-active --quiet minecraft-server; then
    echo "Players online: $(journalctl -u minecraft-server --since "1 minute ago" | grep -c "joined the game" || echo "0")"
fi

echo ""
echo "📝 Recent Logs:"
echo "Manager: $(journalctl -u minecraft-manager --since "5 minutes ago" --no-pager -n 3 | tail -n 1)"
echo "Server: $(journalctl -u minecraft-server --since "5 minutes ago" --no-pager -n 3 | tail -n 1)"
EOF

chmod +x /usr/local/bin/minecraft-status.sh

# Setup log rotation
echo -e "${YELLOW}Configuring log rotation...${NC}"
cat > /etc/logrotate.d/minecraft-manager << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Start services
echo -e "${YELLOW}Starting services...${NC}"
systemctl start minecraft-manager
systemctl start minecraft-server

# Wait for services to start
sleep 5

# Check service status
echo -e "${YELLOW}Checking service status...${NC}"
if systemctl is-active --quiet minecraft-manager; then
    echo "✅ Minecraft Manager Backend: Running"
else
    echo "❌ Minecraft Manager Backend: Failed to start"
    journalctl -u minecraft-manager --no-pager -n 10
fi

if systemctl is-active --quiet minecraft-server; then
    echo "✅ Minecraft Server: Running"
else
    echo "❌ Minecraft Server: Failed to start"
    journalctl -u minecraft-server --no-pager -n 10
fi

if systemctl is-active --quiet nginx; then
    echo "✅ NGINX: Running"
else
    echo "❌ NGINX: Failed to start"
    systemctl status nginx --no-pager
fi

# SSL Certificate setup (optional)
if [ "$DOMAIN" != "YOUR_DOMAIN_HERE" ] && [ "$ADMIN_EMAIL" != "admin@example.com" ]; then
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --email $ADMIN_EMAIL --agree-tos --non-interactive --redirect
else
    echo -e "${YELLOW}Skipping SSL setup - update DOMAIN and ADMIN_EMAIL in script${NC}"
fi

# Final status check
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
if [ "$DOMAIN" != "YOUR_DOMAIN_HERE" ]; then
    echo "   Web Interface: https://$DOMAIN"
else
    echo "   Web Interface: http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')"
fi
echo "   Minecraft Server: $(curl -s ifconfig.me || echo 'YOUR_SERVER_IP'):25565"
echo ""
echo -e "${BLUE}🔐 Default Admin Credentials:${NC}"
echo "   Username: admin"
echo "   Password: admin"
echo "   ⚠️  You will be required to change this password on first login"
echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "   Status Check: /usr/local/bin/minecraft-status.sh"
echo "   Manual Backup: /usr/local/bin/minecraft-backup.sh"
echo "   View Logs: journalctl -u minecraft-manager -f"
echo "   Restart Services: systemctl restart minecraft-manager minecraft-server"
echo ""
echo -e "${BLUE}📁 Important Paths:${NC}"
echo "   Application: $APP_DIR"
echo "   Minecraft Server: $MINECRAFT_DIR"
echo "   Database: $DATA_DIR/data/database.db"
echo "   Backups: $BACKUP_DIR"
echo "   Logs: $LOG_DIR"
echo ""
echo -e "${GREEN}✅ Installation completed successfully!${NC}"
echo -e "${YELLOW}⚠️  Remember to update the DOMAIN and ADMIN_EMAIL variables in this script for SSL setup${NC}"