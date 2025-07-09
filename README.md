# Minecraft Server Manager

A production-ready, full-stack web application for managing Minecraft Fabric servers with comprehensive deployment automation, security hardening, and monitoring capabilities.

## 🚀 Features

### Core Management
- **Server Control**: Start, stop, restart Minecraft servers via systemd integration
- **Mod Management**: Upload, activate, and delete .jar mod files with validation
- **World Management**: Import/export world saves as .tar archives with safety checks
- **Player Monitoring**: Real-time player tracking with inventory and position data
- **User Authentication**: Secure JWT-based authentication with password management

### Production Features
- **Automated Deployment**: One-command setup script for Ubuntu 24.04 LTS
- **Security Hardening**: Firewall, fail2ban, rate limiting, and secure headers
- **SSL Support**: Automatic Let's Encrypt certificate management
- **Monitoring**: System status checks, automated backups, and log rotation
- **Scalability**: Systemd service management with auto-restart capabilities

### Technical Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Security**: JWT tokens, bcrypt hashing, helmet middleware
- **Deployment**: Ubuntu 24.04, systemd, NGINX, Let's Encrypt
- **Monitoring**: Journald logging, automated backups, status scripts

## 📋 Requirements

### System Requirements
- **OS**: Ubuntu 24.04 LTS (recommended) or compatible Linux distribution
- **RAM**: Minimum 2GB (4GB+ recommended for Minecraft server)
- **Storage**: 10GB+ available space
- **Network**: Public IP address (domain name optional)

### Software Dependencies
All dependencies are automatically installed by the setup script:
- Node.js 18+
- Java 17 (OpenJDK)
- NGINX
- SQLite3
- Git
- SSL tools (certbot, if using SSL)

## 🛠️ Installation

### Quick Start (Recommended)

1. **Download and configure the setup script**:
   ```bash
   wget https://raw.githubusercontent.com/yourusername/minecraft-server-manager/main/deployment/setup.sh
   chmod +x setup.sh
   ```

2. **Configure deployment options** (edit the script or use environment variables):
   ```bash
   # For domain-based deployment with SSL
   export DOMAIN="your-domain.com"
   export ADMIN_EMAIL="admin@your-domain.com"
   export USE_SSL="true"
   
   # For IP-only deployment (no SSL)
   export USE_SSL="false"
   ```

3. **Run the setup script**:
   ```bash
   sudo ./setup.sh
   ```

4. **Access your application**:
   - Web Interface: `https://your-domain.com` or `http://your-server-ip`
   - Minecraft Server: `your-domain.com:25565` or `your-server-ip:25565`

### Manual Installation

If you prefer manual installation or need to customize the setup:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/minecraft-server-manager.git
   cd minecraft-server-manager
   ```

2. **Install system dependencies**:
   ```bash
   sudo apt update
   sudo apt install -y nodejs npm nginx openjdk-17-jdk sqlite3 git
   ```

3. **Configure the application**:
   ```bash
   cp config/config.js.example config/config.js
   # Edit config/config.js with your settings
   ```

4. **Install and build**:
   ```bash
   npm install
   cd backend && npm install && npm run build
   cd .. && npm run build
   ```

5. **Set up services and NGINX** (see deployment files for examples)

## ⚙️ Configuration

### Centralized Configuration

All configuration is managed through the `config/config.js` file and environment variables:

```javascript
// Key configuration options
const config = {
  domain: {
    name: process.env.DOMAIN || 'localhost',
    useSSL: process.env.USE_SSL === 'true',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@localhost'
  },
  
  minecraft: {
    version: '1.20.1',
    fabricVersion: '0.15.3',
    port: 25565,
    maxPlayers: 20
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET, // Required in production
    rateLimitMax: 5 // Login attempts per 15 minutes
  }
};
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOMAIN` | Your domain name | `localhost` | No |
| `USE_SSL` | Enable SSL/HTTPS | `false` | No |
| `ADMIN_EMAIL` | Email for SSL certificates | `admin@localhost` | If SSL enabled |
| `JWT_SECRET` | Secret for JWT tokens | Auto-generated | Yes |
| `NODE_ENV` | Environment mode | `production` | No |
| `FABRIC_MOD_ENABLED` | Enable Fabric mod integration | `false` | No |

### Directory Structure

```
/home/ubuntu/minecraft-manager/     # Application files
/home/ubuntu/Minecraft/             # Minecraft server
├── world/                          # World data
├── mods/                          # Mod files
├── backups/                       # Local backups
└── logs/                          # Server logs

/home/ubuntu/minecraft-data/        # Database and app data
/home/ubuntu/minecraft-backups/     # Automated backups
/var/log/minecraft-manager/         # Application logs
```

## 🔐 Security

### Default Credentials
- **Username**: `admin`
- **Password**: `admin`
- ⚠️ **You MUST change this password on first login**

### Security Features
- **Authentication**: JWT-based with secure password hashing (bcrypt)
- **Rate Limiting**: Login attempts limited to prevent brute force
- **Firewall**: UFW configured with minimal required ports
- **Fail2ban**: Automatic IP blocking for suspicious activity
- **SSL/TLS**: Automatic Let's Encrypt certificates (if domain configured)
- **File Validation**: Strict file type checking for uploads
- **Security Headers**: Comprehensive HTTP security headers via helmet

### Firewall Configuration
```bash
# Allowed ports
22/tcp    # SSH
80/tcp    # HTTP
443/tcp   # HTTPS
25565/tcp # Minecraft server
```

## 🎮 Usage

### Web Interface

1. **Login**: Access the web interface and login with admin credentials
2. **Change Password**: You'll be prompted to change the default password
3. **Server Control**: Use the dashboard to start/stop/restart the Minecraft server
4. **Mod Management**: Upload .jar files to add mods to your server
5. **World Management**: Import/export world saves for backups or transfers
6. **Player Monitoring**: View online players and their status

### Command Line Management

```bash
# Check system status
/usr/local/bin/minecraft-status.sh

# Create manual backup
/usr/local/bin/minecraft-backup.sh

# Update application
/usr/local/bin/minecraft-update.sh

# View logs
journalctl -u minecraft-manager -f    # Web application logs
journalctl -u minecraft-server -f     # Minecraft server logs

# Service management
systemctl restart minecraft-manager   # Restart web app
systemctl restart minecraft-server    # Restart Minecraft server
systemctl status minecraft-manager    # Check web app status
systemctl status minecraft-server     # Check server status
```

## 🔧 Maintenance

### Automated Tasks
- **Daily Backups**: Automatic world and database backups at 2 AM
- **Log Rotation**: Automatic cleanup of old log files
- **Service Monitoring**: Systemd automatically restarts failed services

### Manual Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update application
/usr/local/bin/minecraft-update.sh

# Clean up old backups (keeps last 7)
find /home/ubuntu/minecraft-backups -name "*.tar.gz" -mtime +7 -delete

# Check disk usage
df -h
du -sh /home/ubuntu/minecraft-*

# Monitor system resources
htop
```

### Backup and Recovery

**Automated Backups**:
- World data: `/home/ubuntu/minecraft-backups/world_backup_*.tar.gz`
- Database: `/home/ubuntu/minecraft-backups/database_backup_*.db`
- Retention: 7 days (configurable)

**Manual Backup**:
```bash
# Backup everything
tar -czf minecraft-full-backup-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/minecraft-manager \
  /home/ubuntu/Minecraft \
  /home/ubuntu/minecraft-data
```

**Recovery**:
```bash
# Stop services
systemctl stop minecraft-server minecraft-manager

# Restore world
tar -xzf world_backup_YYYYMMDD_HHMMSS.tar.gz -C /home/ubuntu/Minecraft/

# Restore database
cp database_backup_YYYYMMDD_HHMMSS.db /home/ubuntu/minecraft-data/data/database.db

# Fix permissions
chown -R minecraft:minecraft /home/ubuntu/Minecraft
chown -R minecraft-manager:minecraft-manager /home/ubuntu/minecraft-data

# Start services
systemctl start minecraft-manager minecraft-server
```

## 🔌 Fabric Mod Integration

The application supports integration with a custom Fabric mod for enhanced player management:

### Expected API Endpoints
```
GET  /players                    # List all players
GET  /player/:uuid/inventory     # Get player inventory
GET  /player/:uuid/position      # Get player position
POST /player/:uuid/kick          # Kick player
POST /player/:uuid/message       # Send message to player
```

### Sample Response Format
```json
{
  "players": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "username": "Steve",
      "online": true,
      "playtime": "2h 30m",
      "position": { "x": 10, "y": 64, "z": -200 },
      "inventory": [
        { "slot": 0, "item": "minecraft:diamond", "count": 3 }
      ]
    }
  ]
}
```

### Configuration
```bash
# Enable Fabric mod integration
export FABRIC_MOD_ENABLED=true
export FABRIC_MOD_PORT=8080
```

## 🐛 Troubleshooting

### Common Issues

**Services won't start**:
```bash
# Check service status
systemctl status minecraft-manager
systemctl status minecraft-server

# Check logs
journalctl -u minecraft-manager -n 50
journalctl -u minecraft-server -n 50

# Check permissions
ls -la /home/ubuntu/minecraft-*
```

**Web interface not accessible**:
```bash
# Check NGINX status
systemctl status nginx
nginx -t

# Check firewall
ufw status
```

**Database issues**:
```bash
# Check database file
ls -la /home/ubuntu/minecraft-data/data/database.db

# Reinitialize database
cd /home/ubuntu/minecraft-manager
sudo -u minecraft-manager NODE_ENV=production node -e "
const { initDatabase } = require('./backend/dist/database/init.js');
initDatabase();
"
```

**SSL certificate issues**:
```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew --dry-run
```

### Log Locations
- **Application**: `journalctl -u minecraft-manager`
- **Minecraft Server**: `journalctl -u minecraft-server`
- **NGINX**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **System**: `/var/log/syslog`

## 🚀 Deployment Options

### Oracle Cloud Free Tier
Perfect for the Oracle Cloud Always Free tier:
- **Instance**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **Storage**: 47GB boot volume
- **Network**: 10TB outbound transfer per month

### Other Cloud Providers
- **AWS**: t2.micro or t3.micro instances
- **Google Cloud**: e2-micro instances
- **DigitalOcean**: Basic droplets ($5/month)
- **Vultr**: Regular performance instances

### On-Premises
- **Home Server**: Any Linux machine with 2GB+ RAM
- **Raspberry Pi**: Pi 4 with 4GB+ RAM (performance may vary)
- **VPS**: Any VPS with Ubuntu 24.04 support

## 📊 Monitoring

### Built-in Monitoring
- **System Status**: `/usr/local/bin/minecraft-status.sh`
- **Resource Usage**: Memory, disk, CPU monitoring
- **Service Health**: Automatic service restart on failure
- **Log Aggregation**: Centralized logging via journald

### External Monitoring (Optional)
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Log Analysis**: ELK stack, Grafana
- **Alerting**: Email notifications, Slack integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/minecraft-server-manager.git
cd minecraft-server-manager

# Install dependencies
npm install
cd backend && npm install && cd ..

# Set up development environment
cp config/config.js.example config/config.js
# Edit config for development settings

# Start development servers
npm run dev              # Frontend (port 5173)
npm run backend:dev      # Backend (port 3001)
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fabric**: For the excellent Minecraft modding framework
- **React**: For the powerful frontend framework
- **Express**: For the robust backend framework
- **Community**: For feedback, bug reports, and contributions

## 📞 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support

---

**Made with ❤️ for the Minecraft community**