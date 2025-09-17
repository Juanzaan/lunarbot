# Discord Bot Project

## Overview
This is a comprehensive Discord bot built with Node.js and discord.js that provides advanced server management features including ticket systems, auto-roles, captcha verification, backup systems, and moderation tools.

## Project Architecture
- **Language**: Node.js (v20)
- **Main Framework**: discord.js v14
- **Dependencies**: dotenv for environment variables, @types/node for TypeScript support
- **File Structure**: Single-file architecture with all functionality in `index.js`

## Features
### 🎫 Ticket System
- Interactive ticket creation panel with button
- Creates private ticket channels with user-specific permissions
- Ticket claiming system for staff members
- Manual and automatic ticket closure with 10-second delay

### 🔒 Auto-Role System
- Automatically assigns "." role to new members
- Includes both users and bots
- Administrator setup and testing commands

### 🛡️ Captcha Verification
- Reaction-based verification system
- "Verificado" role assignment
- DM notifications for successful verification

### 💾 Backup System
- Complete server backup including roles, channels, and categories
- JSON-based storage in local `backups/` directory
- Commands: `/backup create`, `/backup list`, `/backup info <id>`
- Backup files named with timestamp: `backup_[guild_id]_[timestamp].json`

### 👮 Moderation Tools
- Temporary mute system with time parsing
- Auto-unmute functionality
- DM notifications for moderated users
- Permission-based access control

### 📋 Information Commands
- Help command with all available features
- Discord policy updates information
- Ping/status checking

## Bot Commands
- `/ping` - Bot status check
- `/help` - Complete command list
- `/normativas` - Discord policy updates
- `/ticket panel/close` - Ticket management
- `/autoroles setup/test` - Auto-role configuration
- `/captcha setup/role` - Verification system
- `/backup create/list/info` - Server backup tools
- `/mute/unmute` - Moderation commands

## Setup Requirements
### Discord Developer Portal Configuration
The bot requires these privileged intents to be enabled:

**Required Intents:**
- **Server Members Intent** - For auto-role functionality when new members join
- **Message Content Intent** - For processing message reactions and content

**Troubleshooting:** If you see "Used disallowed intents" error, ensure both required intents above are enabled in Discord Developer Portal > Bot section > Privileged Gateway Intents.

### Bot Invitation
You must invite the bot to your Discord server with proper permissions:

1. **Generate Invite URL:**
   - In Discord Developer Portal, go to OAuth2 > URL Generator
   - Select scopes: `bot` and `applications.commands`
   - Select permissions: Manage Roles, Manage Channels, Read Message History, Send Messages, Add Reactions, Use Application Commands, View Channels

2. **Use the generated URL** to invite the bot to your target Discord server

3. **Ensure the bot's role** is positioned high enough in your server's role hierarchy to manage other roles

### Environment Variables
- `TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `GUILD_ID` - Target Discord server ID

## Recent Changes
- **Setup Date**: September 17, 2025
- **Imported from GitHub** with full functionality intact
- **Environment**: Configured for Replit with proper secrets management
- **Runtime**: Configured with Replit Workflow (node index.js) for continuous operation
- **Deployment**: VM-based deployment configured for production use

## User Preferences
- Spanish language interface for all bot commands and responses
- Comprehensive error handling with user-friendly messages
- Professional embed formatting for all bot responses

## Technical Notes
- Uses discord.js v14 with proper intent management (Guilds, GuildMessages, MessageContent, GuildMembers, GuildMessageReactions)
- File-based backup system with automatic directory creation
- setTimeout-based auto-unmute system for temporary moderation
- Comprehensive permission checking for all admin commands
- Graceful error handling with console logging and user feedback

## Running the Bot
- **Development**: The bot runs automatically via Replit Workflow when properly configured
- **Production**: Use Replit Deployments for persistent, scalable operation
- **Logs**: Monitor console output for connection status and error messages