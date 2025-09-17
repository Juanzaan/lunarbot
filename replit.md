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
- Interactive ticket creation with buttons
- Private ticket channels with proper permissions
- Staff claiming and management
- Automatic ticket closure

### 🔒 Auto-Role System
- Automatically assigns "." role to new members
- Includes both users and bots
- Administrator setup and testing commands

### 🛡️ Captcha Verification
- Reaction-based verification system
- "Verificado" role assignment
- DM notifications for successful verification

### 💾 Backup System
- Complete server backup (roles, channels, categories)
- JSON-based storage in `/backups` directory
- List and detailed backup information commands

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
- **Server Members Intent** - For auto-role functionality
- **Message Content Intent** - For message processing
- **Presence Intent** - For enhanced user detection

### Environment Variables
- `TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `GUILD_ID` - Target Discord server ID

## Recent Changes
- **Setup Date**: September 17, 2025
- **Imported from GitHub** with full functionality intact
- **Environment**: Configured for Replit with proper secrets management
- **Deployment**: VM-based deployment for persistent bot operation

## User Preferences
- Spanish language interface for all bot commands and responses
- Comprehensive error handling with user-friendly messages
- Professional embed formatting for all bot responses

## Technical Notes
- Uses discord.js v14 with proper intent management
- File-based backup system with automatic directory creation
- setTimeout-based auto-unmute system
- Comprehensive permission checking for all admin commands
- Graceful error handling with console logging and user feedback