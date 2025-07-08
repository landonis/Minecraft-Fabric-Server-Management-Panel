#!/bin/bash
# Minecraft Server Manager - Extended Setup Script

set -e
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
