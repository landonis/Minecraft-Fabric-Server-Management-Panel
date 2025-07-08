# Minecraft Server Manager

A production-ready full-stack web application for managing Minecraft Fabric servers, designed for instant deployment on Ubuntu 24.04 LTS (Oracle Cloud Free Tier).

## Features

- **Authentication System**: JWT-based authentication with bcrypt password hashing
- **Server Management**: Start, stop, and restart Minecraft Fabric servers
- **Mod Management**: Upload, manage, and delete .jar mod files
- **World Management**: Export and import world saves as .tar archives
- **Player Monitoring**: View online/offline players (with Fabric mod integration)
- **Real-time Status**: Live server status monitoring and resource usage
- **Secure File Handling**: Validated file uploads with size limits
- **Production Ready**: Complete deployment automation with systemd services

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Security**: JWT tokens, bcrypt, helmet, CORS
- **Deployment**: Ubuntu 24.04, systemd, NGINX, Let's Encrypt
- **File Handling**: Multer for uploads, tar for world archives

## Quick Deployment

### Prerequisites

- Ubuntu 24.04 LTS server (Oracle Cloud Free Tier compatible)
- Domain name pointing to your server
- Root access to the server

### Automated Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/minecraft-server-manager.git
   cd minecraft-server-manager
   ```

2. **Configure deployment**:
   ```bash
   # Edit deployment/setup.sh
   vim deployment/setup.sh
   
   # Update these variables:
   DOMAIN="your-domain.com"
   ADMIN_EMAIL="admin@your-domain.com"
   GITHUB_REPO="https://github.com/yourusername/minecraft-server-manager.git"
   ```

3. **Run the setup script**:
   ```bash
   chmod +x deployment/setup.sh
   sudo ./deployment/setup.sh
   ```

4. **Access your application**:
   - Web Interface: `https://your-domain.com`
   - Minecraft Server: `your-domain.com:25565`

### Default Admin Account

After deployment, you can access the application using:
- **Username**: `admin`
- **Password**: `admin`

⚠️ **Security Notice**: You will be required to change this password on first login. This is a temporary password for initial access only.

## Manual Setup

### Backend Setup

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp deployment/environment.env .env
   # Edit .env with your configuration
   ```

3. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Development server**:
   ```bash
   npm run dev
   ```

## Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `DB_PATH` | SQLite database path | `/opt/minecraft-manager/data/database.db` |
| `MINECRAFT_PATH` | Fabric server directory | `/opt/minecraft` |
| `WORLD_PATH` | World folder path | `/opt/minecraft/world` |
| `MODS_PATH` | Mods directory path | `/opt/minecraft/mods` |
| `FABRIC_MOD_PORT` | Custom Fabric mod API port | `8080` |

### Fabric Mod Integration

The application includes a stub for integrating with a custom Fabric mod that provides real-time player data:

```typescript
// Player data endpoint
GET http://127.0.0.1:8080/players

// Expected response format:
{
  "players": [
    {
      "username": "PlayerName",
      "uuid": "player-uuid",
      "online": true,
      "playtime": "2h 30m",
      "lastSeen": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Server Management
- `GET /api/server/status` - Get server status
- `POST /api/server/start` - Start server
- `POST /api/server/stop` - Stop server
- `POST /api/server/restart` - Restart server
- `GET /api/server/logs` - Get server logs

### Mod Management
- `GET /api/mods` - List all mods
- `POST /api/mods/upload` - Upload mod file
- `DELETE /api/mods/:id` - Delete mod

### World Management
- `GET /api/world/export` - Export world as .tar
- `POST /api/world/import` - Import world from .tar

### Player Management
- `GET /api/players` - Get player list

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- File upload validation
- CORS protection
- Security headers via Helmet
- Firewall configuration
- Fail2ban protection
- SSL/TLS encryption

## System Services

### minecraft-manager.service
- Manages the web application
- Auto-restart on failure
- Logs to systemd journal

### minecraft-server.service
- Manages the Minecraft server
- Auto-restart on failure
- Proper resource allocation

## Monitoring & Maintenance

### Status Check
```bash
/usr/local/bin/minecraft-status.sh
```

### View Logs
```bash
# Web application logs
journalctl -u minecraft-manager -f

# Minecraft server logs
journalctl -u minecraft-server -f
```

### Manual Backup
```bash
/usr/local/bin/minecraft-backup.sh
```

### Service Management
```bash
# Restart web application
sudo systemctl restart minecraft-manager

# Restart Minecraft server
sudo systemctl restart minecraft-server

# Check service status
sudo systemctl status minecraft-manager
sudo systemctl status minecraft-server
```

## File Structure

```
minecraft-server-manager/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── database/      # Database setup
│   └── dist/              # Compiled backend
├── deployment/            # Deployment scripts
│   ├── setup.sh          # Main setup script
│   ├── *.service         # systemd service files
│   └── nginx.conf        # NGINX configuration
└── dist/                 # Built frontend assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the logs using the provided commands
- Review the configuration files

## Changelog

### v1.0.0
- Initial release with full functionality
- Complete deployment automation
- Security hardening
- Production-ready configuration