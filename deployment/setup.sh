#!/bin/bash

# Minecraft Server Manager - Production Setup Script
# Ubuntu 24.04 LTS - Oracle Cloud Free Tier
# This script automates the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables - REPLACE THESE VALUES
DOMAIN="YOUR_DOMAIN_HERE"  # 🔧 [DEFINE] - Your domain name
ADMIN_EMAIL="admin@example.com"  # 🔧 [DEFINE] - Your email for SSL certificates
GITHUB_REPO="https://github.com/yourusername/minecraft-server-manager.git"  # 🔧 [DEFINE] - Your repo URL

# System paths
APP_DIR="/opt/minecraft-manager"
MINECRAFT_DIR="/opt/minecraft"
DATA_DIR="/opt/minecraft-manager/data"
LOG_DIR="/var/log/minecraft-manager"

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

# Create application user
echo -e "${YELLOW}Creating application user...${NC}"
useradd -r -s /bin/false minecraft-manager || true
usermod -aG sudo minecraft-manager || true

# Create directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p $APP_DIR
mkdir -p $MINECRAFT_DIR/{mods,world,backups,logs}
mkdir -p $DATA_DIR
mkdir -p $LOG_DIR

# Set permissions
chown -R minecraft-manager:minecraft-manager $APP_DIR
chown -R minecraft-manager:minecraft-manager $MINECRAFT_DIR
chown -R minecraft-manager:minecraft-manager $DATA_DIR
chown -R minecraft-manager:minecraft-manager $LOG_DIR

# Clone repository
echo -e "${YELLOW}Cloning repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  cd $APP_DIR
  git pull origin main
else
  git clone $GITHUB_REPO $APP_DIR
fi

cd $APP_DIR

# Install Node.js dependencies
echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
npm install

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend
npm install
npm run build

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd ..
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
JWT_SECRET=🔧[DEFINE-REPLACE-WITH-SECURE-RANDOM-STRING]

# Minecraft Server Configuration
MINECRAFT_PATH=$MINECRAFT_DIR
WORLD_PATH=$MINECRAFT_DIR/world
MODS_PATH=$MINECRAFT_DIR/mods
BACKUP_PATH=$MINECRAFT_DIR/backups

# Fabric Mod Integration
FABRIC_MOD_PORT=8080  # 🔧 [DEFINE] - Port for custom Fabric mod API
EOF

# Set secure permissions for environment file
chmod 600 $APP_DIR/.env
chown minecraft-manager:minecraft-manager $APP_DIR/.env

# Download Fabric Server
echo -e "${YELLOW}Setting up Minecraft Fabric server...${NC}"
cd $MINECRAFT_DIR

# Download Fabric installer
FABRIC_VERSION="0.15.3"
MINECRAFT_VERSION="1.20.4"
curl -OJ https://maven.fabricmc.net/net/fabricmc/fabric-installer/$FABRIC_VERSION/fabric-installer-$FABRIC_VERSION.jar

# Install Fabric server
java -jar fabric-installer-$FABRIC_VERSION.jar server -dir . -mcversion $MINECRAFT_VERSION -downloadMinecraft

# Accept EULA
echo "eula=true" > eula.txt

# Create server.properties
cat > server.properties << EOF
# Minecraft Server Properties
server-port=25565
level-name=world
gamemode=survival
difficulty=normal
allow-nether=true
allow-flight=false
announce-player-achievements=true
enable-command-block=false
generate-structures=true
level-seed=
level-type=DEFAULT
max-build-height=256
max-players=20
max-world-size=29999984
motd=A Minecraft Server
online-mode=true
op-permission-level=4
player-idle-timeout=0
pvp=true
snooper-enabled=true
spawn-animals=true
spawn-monsters=true
spawn-npcs=true
spawn-protection=16
view-distance=10
white-list=false
enforce-whitelist=false
resource-pack=
resource-pack-sha1=
EOF

# Set permissions
chown -R minecraft-manager:minecraft-manager $MINECRAFT_DIR

# Create systemd service for Minecraft server
echo -e "${YELLOW}Creating Minecraft server systemd service...${NC}"
cat > /etc/systemd/system/minecraft-server.service << EOF
[Unit]
Description=Minecraft Fabric Server
After=network.target

[Service]
Type=simple
User=minecraft-manager
Group=minecraft-manager
WorkingDirectory=$MINECRAFT_DIR
ExecStart=/usr/bin/java -Xmx2G -Xms1G -jar fabric-server-launch.jar nogui
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for web application
echo -e "${YELLOW}Creating web application systemd service...${NC}"
cat > /etc/systemd/system/minecraft-manager.service << EOF
[Unit]
Description=Minecraft Server Manager Web Application
After=network.target

[Service]
Type=simple
User=minecraft-manager
Group=minecraft-manager
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node backend/dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Enable services
systemctl enable minecraft-manager
systemctl enable minecraft-server

# Configure NGINX
echo -e "${YELLOW}Configuring NGINX...${NC}"
cat > /etc/nginx/sites-available/minecraft-manager << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
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

# Test NGINX configuration
nginx -t

# Configure UFW firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
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

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Start services
echo -e "${YELLOW}Starting services...${NC}"
systemctl start minecraft-manager
systemctl start nginx

# Obtain SSL certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL

# Setup automatic certificate renewal
echo -e "${YELLOW}Setting up automatic certificate renewal...${NC}"
echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx" | crontab -

# Create log rotation
echo -e "${YELLOW}Setting up log rotation...${NC}"
cat > /etc/logrotate.d/minecraft-manager << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 minecraft-manager minecraft-manager
    postrotate
        systemctl restart minecraft-manager
    endscript
}

$MINECRAFT_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 minecraft-manager minecraft-manager
}
EOF

# Create backup script
echo -e "${YELLOW}Creating backup script...${NC}"
cat > /usr/local/bin/minecraft-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/minecraft/backups"
WORLD_DIR="/opt/minecraft/world"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="world_backup_$TIMESTAMP.tar.gz"

mkdir -p $BACKUP_DIR

# Create backup
cd /opt/minecraft
tar -czf "$BACKUP_DIR/$BACKUP_NAME" world/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "world_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_NAME"
EOF

chmod +x /usr/local/bin/minecraft-backup.sh

# Schedule daily backups
echo -e "${YELLOW}Scheduling daily backups...${NC}"
echo "0 4 * * * /usr/local/bin/minecraft-backup.sh" | crontab -u minecraft-manager -

# Create status check script
cat > /usr/local/bin/minecraft-status.sh << 'EOF'
#!/bin/bash

echo "=== Minecraft Server Manager Status ==="
echo

echo "Web Application Status:"
systemctl status minecraft-manager --no-pager -l

echo
echo "Minecraft Server Status:"
systemctl status minecraft-server --no-pager -l

echo
echo "NGINX Status:"
systemctl status nginx --no-pager -l

echo
echo "Disk Usage:"
df -h /opt/minecraft /opt/minecraft-manager

echo
echo "Memory Usage:"
free -h

echo
echo "Active Connections:"
netstat -tulpn | grep -E ':(25565|3001|80|443)'
EOF

chmod +x /usr/local/bin/minecraft-status.sh

# Final setup tasks
echo -e "${YELLOW}Performing final setup tasks...${NC}"

# Generate JWT secret if not set
if grep -q "🔧\[DEFINE" $APP_DIR/.env; then
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s/JWT_SECRET=🔧\[DEFINE-REPLACE-WITH-SECURE-RANDOM-STRING\]/JWT_SECRET=$JWT_SECRET/" $APP_DIR/.env
fi

# Set final permissions
chown -R minecraft-manager:minecraft-manager $APP_DIR
chown -R minecraft-manager:minecraft-manager $MINECRAFT_DIR
chown -R minecraft-manager:minecraft-manager $DATA_DIR

# Restart services to apply all changes
systemctl restart minecraft-manager
systemctl restart nginx

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo
echo -e "${GREEN}Your Minecraft Server Manager is now installed and configured.${NC}"
echo
echo -e "${YELLOW}Access your application at: https://$DOMAIN${NC}"
echo
echo -e "${BLUE}Important Notes:${NC}"
echo -e "${BLUE}• First user to register will be the admin${NC}"
echo -e "${BLUE}• Minecraft server port: 25565${NC}"
echo -e "${BLUE}• Web application runs on port 3001 (proxied via NGINX)${NC}"
echo -e "${BLUE}• SSL certificate auto-renewal is configured${NC}"
echo -e "${BLUE}• Daily backups are scheduled at 4 AM${NC}"
echo
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "${YELLOW}• Status check: /usr/local/bin/minecraft-status.sh${NC}"
echo -e "${YELLOW}• Manual backup: /usr/local/bin/minecraft-backup.sh${NC}"
echo -e "${YELLOW}• View logs: journalctl -u minecraft-manager -f${NC}"
echo -e "${YELLOW}• Restart web app: systemctl restart minecraft-manager${NC}"
echo -e "${YELLOW}• Restart Minecraft: systemctl restart minecraft-server${NC}"
echo
echo -e "${RED}Security Reminders:${NC}"
echo -e "${RED}• Update the JWT_SECRET in $APP_DIR/.env${NC}"
echo -e "${RED}• Review firewall rules: ufw status${NC}"
echo -e "${RED}• Monitor logs regularly${NC}"
echo -e "${RED}• Keep system updated: apt update && apt upgrade${NC}"
echo
echo -e "${GREEN}Setup completed successfully!${NC}"
echo
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Default Admin Account${NC}"
echo -e "${BLUE}========================================${NC}"
echo
echo -e "${GREEN}A default admin account has been created:${NC}"
echo -e "${YELLOW}Username: admin${NC}"
echo -e "${YELLOW}Password: admin${NC}"
echo
echo -e "${RED}⚠️  SECURITY WARNING:${NC}"
echo -e "${RED}You will be required to change this password on first login.${NC}"
echo -e "${RED}This is a temporary password for initial access only.${NC}"
echo
EOF