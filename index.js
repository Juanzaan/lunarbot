const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ] 
});

// Backup system functions
async function createBackup(guild) {
  const backupData = {
    guild: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      description: guild.description,
      ownerId: guild.ownerId,
      verificationLevel: guild.verificationLevel,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      explicitContentFilter: guild.explicitContentFilter,
      mfaLevel: guild.mfaLevel,
      createdAt: guild.createdTimestamp
    },
    roles: [],
    channels: [],
    categories: [],
    timestamp: Date.now(),
    backupId: `backup_${guild.id}_${Date.now()}`
  };

  // Backup roles
  guild.roles.cache.forEach(role => {
    if (!role.managed && role.id !== guild.id) {
      backupData.roles.push({
        id: role.id,
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        createdAt: role.createdTimestamp
      });
    }
  });

  // Backup channels and categories
  guild.channels.cache.forEach(channel => {
    if (channel.type === ChannelType.GuildCategory) {
      backupData.categories.push({
        id: channel.id,
        name: channel.name,
        position: channel.position,
        createdAt: channel.createdTimestamp
      });
    } else {
      const channelData = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        position: channel.position,
        parentId: channel.parentId,
        createdAt: channel.createdTimestamp
      };

      if (channel.topic) channelData.topic = channel.topic;
      if (channel.nsfw !== undefined) channelData.nsfw = channel.nsfw;
      if (channel.rateLimitPerUser) channelData.rateLimitPerUser = channel.rateLimitPerUser;
      
      backupData.channels.push(channelData);
    }
  });

  return backupData;
}

async function saveBackup(backupData) {
  const backupsDir = 'backups';
  const fileName = `${backupData.backupId}.json`;
  const filePath = path.join(backupsDir, fileName);

  try {
    // Create backups directory if it doesn't exist
    await fs.mkdir(backupsDir, { recursive: true });
    
    // Save backup to file
    await fs.writeFile(filePath, JSON.stringify(backupData, null, 2));
    
    return { success: true, filePath, backupId: backupData.backupId };
  } catch (error) {
    console.error('Error saving backup:', error);
    return { success: false, error: error.message };
  }
}

async function listBackups() {
  const backupsDir = 'backups';
  
  try {
    await fs.mkdir(backupsDir, { recursive: true });
    const files = await fs.readdir(backupsDir);
    const backupFiles = files.filter(file => file.endsWith('.json'));
    
    const backups = [];
    for (const file of backupFiles) {
      try {
        const filePath = path.join(backupsDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        const backupData = JSON.parse(data);
        backups.push({
          id: backupData.backupId,
          guildName: backupData.guild.name,
          timestamp: backupData.timestamp,
          date: new Date(backupData.timestamp).toLocaleString('es-ES'),
          rolesCount: backupData.roles.length,
          channelsCount: backupData.channels.length,
          categoriesCount: backupData.categories.length,
          fileName: file
        });
      } catch (err) {
        console.error(`Error reading backup file ${file}:`, err);
      }
    }
    
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

async function getBackupInfo(backupId) {
  const backupsDir = 'backups';
  const fileName = `${backupId}.json`;
  const filePath = path.join(backupsDir, fileName);
  
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading backup:', error);
    return null;
  }
}

// Configuration system
async function loadConfig(guildId) {
  const configDir = 'configs';
  const fileName = `config_${guildId}.json`;
  const filePath = path.join(configDir, fileName);
  
  try {
    await fs.mkdir(configDir, { recursive: true });
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return default config if file doesn't exist
    return getDefaultConfig();
  }
}

async function saveConfig(guildId, config) {
  const configDir = 'configs';
  const fileName = `config_${guildId}.json`;
  const filePath = path.join(configDir, fileName);
  
  try {
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving config:', error);
    return false;
  }
}

function getDefaultConfig() {
  return {
    tickets: {
      panelTitle: '🎫 Sistema de Tickets',
      panelDescription: 'Haz clic en el botón de abajo para crear un ticket de soporte.\n\n**¿Cuándo usar tickets?**\n• Reportar problemas\n• Solicitar ayuda\n• Preguntas importantes\n• Sugerencias\n\n*Los tickets son privados y solo el staff puede verlos.*',
      welcomeTitle: '🎫 Ticket Creado',
      welcomeDescription: '¡Hola {user}! Tu ticket ha sido creado exitosamente.\n\n**¿Qué hacer ahora?**\n• Explica tu problema o pregunta en detalle\n• El staff será notificado y te responderá pronto\n• Mantén la conversación aquí\n\n**Para cerrar el ticket:**\nUsa el comando `/ticket close` cuando hayas terminado.',
      categories: ['General', 'Soporte', 'Reportes', 'Sugerencias'],
      logChannel: null,
      staffRoles: ['Staff', 'Captain', 'Reclutador', 'Colider', 'Lider', 'Founder']
    },
    autoroles: {
      enabled: true,
      roles: ['.'],  // Can now have multiple roles
      botRoles: ['.'], // Separate roles for bots
      humanRoles: ['.'], // Separate roles for humans
      welcomeMessage: 'Bienvenido al servidor!',
      sendDM: false
    },
    captcha: {
      enabled: false,
      type: 'reaction', // 'reaction', 'button', 'math'
      verifiedRole: 'Verificado',
      autoKickTime: 300000, // 5 minutes in ms
      title: '🛡️ Verificación de Captcha',
      description: '**¡Bienvenido al servidor!**\n\nPara acceder a todos los canales y participar en la comunidad, necesitas verificarte.\n\n**¿Cómo verificarte?**\n• Reacciona con ✅ a este mensaje\n• Recibirás automáticamente el rol de "Verificado"\n• Podrás acceder a todos los canales\n\n*Este paso es obligatorio para evitar bots y spam.*'
    }
  };
}

// Function to check if user has staff roles for ticket management
function hasStaffRole(member, config = null) {
  let staffRoles = ['Staff', 'Captain', 'Reclutador', 'Colider', 'Lider', 'Founder'];
  
  if (config && config.tickets && config.tickets.staffRoles) {
    staffRoles = config.tickets.staffRoles;
  }
  
  return member.roles.cache.some(role => staffRoles.includes(role.name));
}

// Parse time string to milliseconds (e.g., "1h", "30m", "2d")
function parseTime(timeStr) {
  const timeRegex = /^(\d+)(s|m|h|d|w)$/;
  const match = timeStr.toLowerCase().match(timeRegex);
  
  if (!match) return null;
  
  const [, amount, unit] = match;
  const num = parseInt(amount);
  
  const multipliers = {
    s: 1000,           // seconds
    m: 60 * 1000,      // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000 // weeks
  };
  
  return num * multipliers[unit];
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Auto-role system for new members
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const guild = member.guild;
    const config = await loadConfig(guild.id);
    
    if (!config.autoroles.enabled) {
      return;
    }
    
    // Determine which roles to assign based on member type
    let rolesToAssign = [];
    if (member.user.bot) {
      rolesToAssign = config.autoroles.botRoles || config.autoroles.roles;
    } else {
      rolesToAssign = config.autoroles.humanRoles || config.autoroles.roles;
    }
    
    // Assign all configured roles
    for (const roleName of rolesToAssign) {
      let role = guild.roles.cache.find(r => r.name === roleName);
      
      // Create role if it doesn't exist
      if (!role) {
        role = await guild.roles.create({
          name: roleName,
          color: '#95a5a6',
          reason: 'Auto-role created by bot for new members'
        });
        console.log(`Created auto-role "${roleName}" in guild: ${guild.name}`);
      }
      
      await member.roles.add(role);
      console.log(`Assigned auto-role "${roleName}" to new member: ${member.user.tag} (Bot: ${member.user.bot ? 'Yes' : 'No'})`);
    }
    
    // Send welcome DM if enabled
    if (config.autoroles.sendDM && !member.user.bot && config.autoroles.welcomeMessage) {
      try {
        await member.send({
          embeds: [{
            title: '¡Bienvenido!',
            description: config.autoroles.welcomeMessage,
            color: 0x00FF00,
            footer: {
              text: guild.name
            }
          }]
        });
      } catch (dmError) {
        console.log(`Could not send welcome DM to ${member.user.tag}`);
      }
    }
    
  } catch (error) {
    console.error('Error in auto-role system:', error);
  }
});

// Captcha system with reactions
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;
  
  try {
    // Fetch the message if it's a partial
    if (reaction.partial) {
      await reaction.fetch();
    }
    
    const guild = reaction.message.guild;
    const member = guild.members.cache.get(user.id);
    
    // Check if this is a captcha verification reaction
    if (reaction.emoji.name === '✅' && 
        reaction.message.embeds.length > 0 && 
        reaction.message.embeds[0].title === '🛡️ Verificación de Captcha') {
      
      // Find the "Verificado" role
      let verifiedRole = guild.roles.cache.find(role => role.name === 'Verificado');
      
      if (!verifiedRole) {
        verifiedRole = await guild.roles.create({
          name: 'Verificado',
          color: '#00FF00',
          reason: 'Role for verified members after captcha'
        });
        console.log(`Created "Verificado" role in guild: ${guild.name}`);
      }
      
      // Check if user already has the verified role
      if (member.roles.cache.has(verifiedRole.id)) {
        return; // User is already verified
      }
      
      // Assign the verified role
      await member.roles.add(verifiedRole);
      console.log(`User ${user.tag} passed captcha verification`);
      
      // Send a DM to the user
      try {
        await user.send({
          embeds: [{
            title: '✅ Verificación Completada',
            description: `¡Felicidades! Has sido verificado exitosamente en **${guild.name}**.\n\nAhora puedes acceder a todos los canales del servidor.`,
            color: 0x00FF00,
            footer: {
              text: 'Sistema de Captcha'
            }
          }]
        });
      } catch (dmError) {
        console.log(`Could not send DM to ${user.tag}`);
      }
    }
    
  } catch (error) {
    console.error('Error in captcha reaction handler:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
  
  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
  
  if (interaction.commandName === 'help') {
    const helpEmbed = {
      title: '🤖 Comandos Disponibles',
      description: 'Aquí tienes la lista de comandos que puedes usar:',
      color: 0x0099FF,
      fields: [
        {
          name: '/ping',
          value: 'Responde con "Pong!" para verificar que el bot está funcionando',
          inline: false
        },
        {
          name: '/help',
          value: 'Muestra esta lista de comandos disponibles',
          inline: false
        },
        {
          name: '/normativas',
          value: 'Muestra las últimas actualizaciones de las normativas y políticas de Discord',
          inline: false
        },
        {
          name: '/ticket panel',
          value: 'Crea un panel con botón para que los usuarios puedan crear tickets',
          inline: false
        },
        {
          name: '/ticket close',
          value: 'Cierra el ticket actual (solo disponible en canales de ticket)',
          inline: false
        },
        {
          name: '/autoroles setup',
          value: 'Configura el sistema de autoroles para asignar el rol "." a nuevos miembros',
          inline: false
        },
        {
          name: '/autoroles test',
          value: 'Prueba el sistema de autoroles (solo administradores)',
          inline: false
        },
        {
          name: '/captcha setup',
          value: 'Configura el sistema de captcha con reacciones para verificar usuarios',
          inline: false
        },
        {
          name: '/captcha role',
          value: 'Muestra información sobre el rol de verificación y estadísticas',
          inline: false
        },
        {
          name: '/backup create',
          value: 'Crea un backup completo del servidor (roles, canales, configuración)',
          inline: false
        },
        {
          name: '/backup list',
          value: 'Muestra la lista de todos los backups disponibles',
          inline: false
        },
        {
          name: '/backup info <id>',
          value: 'Muestra información detallada de un backup específico',
          inline: false
        },
        {
          name: '/mute <usuario> [tiempo] [razón]',
          value: 'Mutea a un usuario temporalmente (requiere permisos de moderación)',
          inline: false
        },
        {
          name: '/unmute <usuario>',
          value: 'Desmutea a un usuario (requiere permisos de moderación)',
          inline: false
        }
      ],
      footer: {
        text: 'Bot de Discord creado con discord.js'
      }
    };
    
    await interaction.reply({ embeds: [helpEmbed] });
  }
  
  if (interaction.commandName === 'normativas') {
    const normativasEmbed = {
      title: '📋 Actualizaciones de Normativas de Discord',
      description: '**Últimas actualizaciones importantes de las políticas de Discord**',
      color: 0x5865F2,
      fields: [
        {
          name: '🔴 Fecha Efectiva: 29 de Septiembre, 2025',
          value: 'Actualización comprensiva de todas las políticas principales de Discord',
          inline: false
        },
        {
          name: '📜 Políticas Actualizadas',
          value: '• **Términos de Servicio**\n• **Directrices de la Comunidad**\n• **Política de Privacidad**\n• **Términos de Servicios Pagos**',
          inline: false
        },
        {
          name: '💎 Discord Orbs',
          value: 'Nuevo sistema de recompensas virtuales agregado a los términos de servicios pagos',
          inline: true
        },
        {
          name: '🛡️ Directrices Mejoradas',
          value: 'Explicaciones más detalladas para ayudar a entender mejor las reglas de la comunidad',
          inline: true
        },
        {
          name: '🔒 Política de Privacidad',
          value: 'Mayor transparencia en la recolección de datos y controles mejorados de privacidad',
          inline: false
        },
        {
          name: '⚖️ Arbitraje',
          value: 'Proceso de resolución de disputas actualizado. Puedes optar por no participar enviando un email a arbitration-opt-out@discord.com antes del 29 de septiembre',
          inline: false
        },
        {
          name: '💰 Aplicaciones Premium (Oct 2024)',
          value: 'Los desarrolladores deben soportar productos Premium Apps de Discord para funciones pagadas',
          inline: false
        }
      ],
      footer: {
        text: 'Información actualizada • Visita discord.com/safety para más detalles'
      },
      timestamp: new Date().toISOString()
    };
    
    await interaction.reply({ embeds: [normativasEmbed] });
  }
  
  if (interaction.commandName === 'ticket') {
    const subcommand = interaction.options.getSubcommand();
    const config = await loadConfig(interaction.guild.id);
    
    if (subcommand === 'panel') {
      const ticketEmbed = {
        title: config.tickets.panelTitle,
        description: config.tickets.panelDescription,
        color: 0x00FF00,
        footer: {
          text: 'Sistema de tickets • Respuesta rápida garantizada'
        }
      };

      const createTicketButton = new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('📩 Crear Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫');

      const row = new ActionRowBuilder()
        .addComponents(createTicketButton);

      await interaction.reply({ 
        embeds: [ticketEmbed], 
        components: [row],
        ephemeral: false 
      });
    }
    
    if (subcommand === 'close') {
      if (!interaction.channel.name.startsWith('ticket-')) {
        return await interaction.reply({
          content: '❌ Este comando solo se puede usar en canales de tickets.',
          ephemeral: true
        });
      }
      
      // Check if user has staff role
      if (!hasStaffRole(interaction.member)) {
        return await interaction.reply({
          content: '❌ Solo los miembros del staff (Staff, Captain, Reclutador, Colider, Lider, Founder) pueden cerrar tickets.',
          ephemeral: true
        });
      }
      
      const closeEmbed = {
        title: '🔒 Cerrar Ticket',
        description: `Ticket cerrado por ${interaction.user}\n\n**Motivo:** Resuelto\n**Fecha:** ${new Date().toLocaleString('es-ES')}`,
        color: 0xFF0000,
        footer: {
          text: 'Ticket cerrado • El canal se eliminará en 10 segundos'
        }
      };
      
      await interaction.reply({ embeds: [closeEmbed] });
      
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.error('Error al eliminar el canal:', error);
        }
      }, 10000);
    }
    
    if (subcommand === 'config') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: '❌ Necesitas permisos de administrador para configurar el sistema de tickets.',
          ephemeral: true
        });
      }
      
      const tipo = interaction.options.getString('tipo');
      const mensaje = interaction.options.getString('mensaje');
      
      try {
        const config = await loadConfig(interaction.guild.id);
        
        // Update the specified configuration
        switch (tipo) {
          case 'panel_title':
            config.tickets.panelTitle = mensaje;
            break;
          case 'panel_desc':
            config.tickets.panelDescription = mensaje;
            break;
          case 'welcome_title':
            config.tickets.welcomeTitle = mensaje;
            break;
          case 'welcome_desc':
            config.tickets.welcomeDescription = mensaje;
            break;
        }
        
        await saveConfig(interaction.guild.id, config);
        
        const configEmbed = {
          title: '⚙️ Configuración de Tickets Actualizada',
          description: `La configuración del sistema de tickets ha sido actualizada exitosamente.`,
          color: 0x00FF00,
          fields: [
            {
              name: '🔧 Configuración modificada',
              value: `**Tipo:** ${tipo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n**Nuevo valor:** ${mensaje.length > 100 ? mensaje.substring(0, 100) + '...' : mensaje}`,
              inline: false
            },
            {
              name: '💡 Consejo',
              value: 'Usa `/ticket panel` para ver cómo se ve el nuevo mensaje en acción.',
              inline: false
            }
          ],
          footer: {
            text: 'Configuración guardada • ' + interaction.user.tag
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.reply({ embeds: [configEmbed], ephemeral: true });
        
      } catch (error) {
        console.error('Error updating ticket config:', error);
        await interaction.reply({
          content: '❌ Error al actualizar la configuración. Inténtalo de nuevo.',
          ephemeral: true
        });
      }
    }
  }
  
  if (interaction.commandName === 'autoroles') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'setup') {
      try {
        const guild = interaction.guild;
        
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return await interaction.reply({
            content: '❌ Necesitas permisos de administrador para configurar el sistema de autoroles.',
            ephemeral: true
          });
        }
        
        // Find or create the "." role
        let autoRole = guild.roles.cache.find(role => role.name === '.');
        
        if (!autoRole) {
          autoRole = await guild.roles.create({
            name: '.',
            color: '#95a5a6',
            reason: 'Auto-role created by administrator'
          });
        }
        
        const setupEmbed = {
          title: '⚙️ Sistema de Autoroles Configurado',
          description: `El sistema de autoroles ha sido configurado exitosamente.\n\n**Rol asignado:** ${autoRole}\n**Color:** Gris\n**Funcionalidad:** Se asignará automáticamente a todos los nuevos miembros que se unan al servidor (incluyendo bots)`,
          color: 0x00FF00,
          fields: [
            {
              name: '✅ ¿Qué hace?',
              value: '• Asigna automáticamente el rol "." a nuevos miembros\n• Incluye tanto usuarios como bots\n• Se ejecuta instantáneamente al unirse',
              inline: false
            },
            {
              name: '🔧 Gestión',
              value: 'Puedes modificar el rol "." desde la configuración del servidor\n• Cambiar color\n• Cambiar permisos\n• Renombrar (no recomendado)',
              inline: false
            }
          ],
          footer: {
            text: 'Sistema de autoroles activo • Configurado por ' + interaction.user.tag
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.reply({ embeds: [setupEmbed] });
        
      } catch (error) {
        console.error('Error setting up auto-roles:', error);
        await interaction.reply({
          content: '❌ Error al configurar el sistema de autoroles. Verifica que el bot tenga permisos para gestionar roles.',
          ephemeral: true
        });
      }
    }
    
    if (subcommand === 'test') {
      try {
        const guild = interaction.guild;
        const member = interaction.member;
        
        // Check if user has administrator permissions
        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
          return await interaction.reply({
            content: '❌ Necesitas permisos de administrador para probar el sistema.',
            ephemeral: true
          });
        }
        
        // Find the "." role
        const autoRole = guild.roles.cache.find(role => role.name === '.');
        
        if (!autoRole) {
          return await interaction.reply({
            content: '❌ El rol de autoroles no existe. Usa `/autoroles setup` primero.',
            ephemeral: true
          });
        }
        
        // Check if user already has the role
        if (member.roles.cache.has(autoRole.id)) {
          await member.roles.remove(autoRole);
          await interaction.reply({
            content: `✅ Rol "${autoRole.name}" removido para prueba. Agregándolo de nuevo...`,
            ephemeral: true
          });
          
          // Wait 2 seconds and add it back
          setTimeout(async () => {
            try {
              await member.roles.add(autoRole);
              await interaction.followUp({
                content: `✅ Rol "${autoRole.name}" asignado nuevamente. ¡El sistema está funcionando!`,
                ephemeral: true
              });
            } catch (error) {
              console.error('Error in test:', error);
            }
          }, 2000);
        } else {
          await member.roles.add(autoRole);
          await interaction.reply({
            content: `✅ Rol "${autoRole.name}" asignado exitosamente. ¡El sistema está funcionando!`,
            ephemeral: true
          });
        }
        
      } catch (error) {
        console.error('Error testing auto-roles:', error);
        await interaction.reply({
          content: '❌ Error al probar el sistema de autoroles.',
          ephemeral: true
        });
      }
    }
    
    if (subcommand === 'config') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: '❌ Necesitas permisos de administrador para configurar el sistema de autoroles.',
          ephemeral: true
        });
      }
      
      const opcion = interaction.options.getString('opcion');
      const valor = interaction.options.getString('valor');
      const config = await loadConfig(interaction.guild.id);
      
      try {
        switch (opcion) {
          case 'toggle':
            config.autoroles.enabled = !config.autoroles.enabled;
            await interaction.reply({
              embeds: [{
                title: '⚙️ Sistema de Auto-roles',
                description: `El sistema de auto-roles ha sido **${config.autoroles.enabled ? 'activado' : 'desactivado'}**`,
                color: config.autoroles.enabled ? 0x00FF00 : 0xFF0000
              }],
              ephemeral: true
            });
            break;
            
          case 'add_role':
            if (!valor) {
              return await interaction.reply({
                content: '❌ Debes especificar el nombre del rol a agregar.',
                ephemeral: true
              });
            }
            
            if (!config.autoroles.roles.includes(valor)) {
              config.autoroles.roles.push(valor);
              config.autoroles.humanRoles.push(valor);
              config.autoroles.botRoles.push(valor);
            }
            
            await interaction.reply({
              embeds: [{
                title: '✅ Rol Agregado',
                description: `El rol "${valor}" ha sido agregado al sistema de auto-roles`,
                color: 0x00FF00
              }],
              ephemeral: true
            });
            break;
            
          case 'welcome_msg':
            if (!valor) {
              return await interaction.reply({
                content: '❌ Debes especificar el mensaje de bienvenida.',
                ephemeral: true
              });
            }
            
            config.autoroles.welcomeMessage = valor;
            await interaction.reply({
              embeds: [{
                title: '✅ Mensaje Actualizado',
                description: `Mensaje de bienvenida actualizado:\n"${valor}"`,
                color: 0x00FF00
              }],
              ephemeral: true
            });
            break;
            
          case 'dm_toggle':
            config.autoroles.sendDM = !config.autoroles.sendDM;
            await interaction.reply({
              embeds: [{
                title: '⚙️ DM de Bienvenida',
                description: `Los DM de bienvenida han sido **${config.autoroles.sendDM ? 'activados' : 'desactivados'}**`,
                color: config.autoroles.sendDM ? 0x00FF00 : 0xFF0000
              }],
              ephemeral: true
            });
            break;
        }
        
        await saveConfig(interaction.guild.id, config);
        
      } catch (error) {
        console.error('Error updating autoroles config:', error);
        await interaction.reply({
          content: '❌ Error al actualizar la configuración.',
          ephemeral: true
        });
      }
    }
    
    if (subcommand === 'list') {
      const config = await loadConfig(interaction.guild.id);
      
      const listEmbed = {
        title: '📋 Configuración de Auto-roles',
        description: `Estado actual del sistema de auto-roles en ${interaction.guild.name}`,
        color: config.autoroles.enabled ? 0x00FF00 : 0xFF0000,
        fields: [
          {
            name: '🔄 Estado del Sistema',
            value: config.autoroles.enabled ? '✅ Activado' : '❌ Desactivado',
            inline: true
          },
          {
            name: '👥 Roles para Humanos',
            value: config.autoroles.humanRoles.length > 0 ? config.autoroles.humanRoles.join(', ') : 'Ninguno',
            inline: true
          },
          {
            name: '🤖 Roles para Bots',
            value: config.autoroles.botRoles.length > 0 ? config.autoroles.botRoles.join(', ') : 'Ninguno',
            inline: true
          },
          {
            name: '💬 DM de Bienvenida',
            value: config.autoroles.sendDM ? '✅ Activado' : '❌ Desactivado',
            inline: true
          },
          {
            name: '📝 Mensaje de Bienvenida',
            value: config.autoroles.welcomeMessage || 'No configurado',
            inline: false
          }
        ],
        footer: {
          text: 'Usa /autoroles config para modificar estas configuraciones'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.reply({ embeds: [listEmbed], ephemeral: true });
    }
  }
  
  if (interaction.commandName === 'captcha') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'setup') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: '❌ Necesitas permisos de administrador para configurar el sistema de captcha.',
          ephemeral: true
        });
      }
      
      try {
        const guild = interaction.guild;
        
        // Create or find the "Verificado" role
        let verifiedRole = guild.roles.cache.find(role => role.name === 'Verificado');
        
        if (!verifiedRole) {
          verifiedRole = await guild.roles.create({
            name: 'Verificado',
            color: '#00FF00',
            reason: 'Role for verified members after captcha'
          });
        }
        
        // Create the captcha embed
        const captchaEmbed = {
          title: '🛡️ Verificación de Captcha',
          description: '**¡Bienvenido al servidor!**\n\nPara acceder a todos los canales y participar en la comunidad, necesitas verificarte.\n\n**¿Cómo verificarte?**\n• Reacciona con ✅ a este mensaje\n• Recibirás automáticamente el rol de "Verificado"\n• Podrás acceder a todos los canales\n\n*Este paso es obligatorio para evitar bots y spam.*',
          color: 0x5865F2,
          fields: [
            {
              name: '🎯 ¿Por qué verificarse?',
              value: '• Protege el servidor de bots maliciosos\n• Mantiene la comunidad segura\n• Acceso completo a todos los canales',
              inline: false
            },
            {
              name: '⚡ Instrucciones',
              value: 'Simplemente haz clic en la reacción ✅ de abajo',
              inline: false
            }
          ],
          footer: {
            text: 'Sistema de Captcha • Un solo clic para acceso completo'
          },
          timestamp: new Date().toISOString()
        };
        
        // Send the captcha message
        const captchaMessage = await interaction.reply({
          embeds: [captchaEmbed],
          fetchReply: true
        });
        
        // Add the reaction
        await captchaMessage.react('✅');
        
        console.log(`Captcha system set up in guild: ${guild.name}`);
        
      } catch (error) {
        console.error('Error setting up captcha:', error);
        await interaction.reply({
          content: '❌ Error al configurar el sistema de captcha. Verifica que el bot tenga los permisos necesarios.',
          ephemeral: true
        });
      }
    }
    
    if (subcommand === 'role') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: '❌ Necesitas permisos de administrador para ver información del sistema.',
          ephemeral: true
        });
      }
      
      try {
        const guild = interaction.guild;
        
        // Find the "Verificado" role
        const verifiedRole = guild.roles.cache.find(role => role.name === 'Verificado');
        
        if (!verifiedRole) {
          return await interaction.reply({
            content: '❌ El rol "Verificado" no existe. Usa `/captcha setup` primero.',
            ephemeral: true
          });
        }
        
        const membersWithRole = guild.members.cache.filter(member => 
          member.roles.cache.has(verifiedRole.id)
        ).size;
        
        const roleInfoEmbed = {
          title: '📊 Información del Sistema de Captcha',
          description: 'Estado actual del sistema de verificación',
          color: 0x00FF00,
          fields: [
            {
              name: '🎭 Rol de Verificación',
              value: `${verifiedRole}`,
              inline: true
            },
            {
              name: '👥 Miembros Verificados',
              value: `${membersWithRole} usuarios`,
              inline: true
            },
            {
              name: '🆔 ID del Rol',
              value: verifiedRole.id,
              inline: true
            },
            {
              name: '🎨 Color del Rol',
              value: verifiedRole.hexColor,
              inline: true
            },
            {
              name: '📅 Creado',
              value: verifiedRole.createdAt.toLocaleDateString('es-ES'),
              inline: true
            },
            {
              name: '⚙️ Configuración',
              value: 'Para modificar permisos, usa la configuración del servidor',
              inline: false
            }
          ],
          footer: {
            text: 'Sistema de Captcha • Información del rol'
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.reply({ embeds: [roleInfoEmbed], ephemeral: true });
        
      } catch (error) {
        console.error('Error getting role info:', error);
        await interaction.reply({
          content: '❌ Error al obtener información del rol.',
          ephemeral: true
        });
      }
    }
  }
  
  if (interaction.commandName === 'backup') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'create') {
      // Check if user has administrator permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
          content: '❌ Necesitas permisos de administrador para crear backups.',
          ephemeral: true
        });
      }
      
      await interaction.deferReply();
      
      try {
        const guild = interaction.guild;
        
        // Create backup data
        const backupData = await createBackup(guild);
        
        // Save backup to file
        const result = await saveBackup(backupData);
        
        if (result.success) {
          const backupEmbed = {
            title: '💾 Backup Creado Exitosamente',
            description: `Se ha creado un backup completo del servidor **${guild.name}**`,
            color: 0x00FF00,
            fields: [
              {
                name: '🆔 ID del Backup',
                value: `\`${result.backupId}\``,
                inline: false
              },
              {
                name: '📊 Contenido del Backup',
                value: `• **${backupData.roles.length}** roles\n• **${backupData.channels.length}** canales\n• **${backupData.categories.length}** categorías\n• Configuración del servidor`,
                inline: false
              },
              {
                name: '📅 Fecha de Creación',
                value: new Date(backupData.timestamp).toLocaleString('es-ES'),
                inline: true
              },
              {
                name: '📁 Archivo',
                value: `\`${result.backupId}.json\``,
                inline: true
              }
            ],
            footer: {
              text: 'Backup guardado • Usa /backup list para ver todos los backups'
            },
            timestamp: new Date().toISOString()
          };
          
          await interaction.editReply({ embeds: [backupEmbed] });
          console.log(`Backup created for guild: ${guild.name} (ID: ${result.backupId})`);
          
        } else {
          await interaction.editReply({
            content: `❌ Error al crear el backup: ${result.error}`
          });
        }
        
      } catch (error) {
        console.error('Error creating backup:', error);
        await interaction.editReply({
          content: '❌ Error inesperado al crear el backup. Revisa los logs para más detalles.'
        });
      }
    }
    
    if (subcommand === 'list') {
      await interaction.deferReply();
      
      try {
        const backups = await listBackups();
        
        if (backups.length === 0) {
          const noBackupsEmbed = {
            title: '📁 Lista de Backups',
            description: 'No hay backups disponibles.\n\nUsa `/backup create` para crear tu primer backup.',
            color: 0xFFFF00,
            footer: {
              text: 'Sistema de Backups'
            }
          };
          
          return await interaction.editReply({ embeds: [noBackupsEmbed] });
        }
        
        const backupList = backups.slice(0, 10).map((backup, index) => 
          `**${index + 1}.** \`${backup.id}\`\n• **Servidor:** ${backup.guildName}\n• **Fecha:** ${backup.date}\n• **Contenido:** ${backup.rolesCount} roles, ${backup.channelsCount} canales, ${backup.categoriesCount} categorías\n`
        ).join('\n');
        
        const listEmbed = {
          title: '📁 Lista de Backups',
          description: `Se encontraron **${backups.length}** backup(s) disponible(s):\n\n${backupList}`,
          color: 0x0099FF,
          fields: [
            {
              name: '💡 Información',
              value: 'Usa `/backup info <id>` para ver detalles específicos de un backup.\nSe muestran los 10 backups más recientes.',
              inline: false
            }
          ],
          footer: {
            text: `Total: ${backups.length} backup(s) • Sistema de Backups`
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.editReply({ embeds: [listEmbed] });
        
      } catch (error) {
        console.error('Error listing backups:', error);
        await interaction.editReply({
          content: '❌ Error al obtener la lista de backups.'
        });
      }
    }
    
    if (subcommand === 'info') {
      const backupId = interaction.options.getString('backup_id');
      
      if (!backupId) {
        return await interaction.reply({
          content: '❌ Debes proporcionar el ID del backup.',
          ephemeral: true
        });
      }
      
      await interaction.deferReply();
      
      try {
        const backupData = await getBackupInfo(backupId);
        
        if (!backupData) {
          return await interaction.editReply({
            content: `❌ No se encontró un backup con el ID: \`${backupId}\``
          });
        }
        
        const rolesList = backupData.roles.slice(0, 10).map(role => `• ${role.name}`).join('\n');
        const channelsList = backupData.channels.slice(0, 10).map(channel => `• ${channel.name}`).join('\n');
        const categoriesList = backupData.categories.slice(0, 5).map(cat => `• ${cat.name}`).join('\n');
        
        const infoEmbed = {
          title: '📋 Información del Backup',
          description: `Detalles del backup **${backupData.backupId}**`,
          color: 0x5865F2,
          fields: [
            {
              name: '🏰 Servidor',
              value: `**Nombre:** ${backupData.guild.name}\n**ID:** ${backupData.guild.id}\n**Propietario:** <@${backupData.guild.ownerId}>`,
              inline: false
            },
            {
              name: '📊 Estadísticas',
              value: `• **${backupData.roles.length}** roles\n• **${backupData.channels.length}** canales\n• **${backupData.categories.length}** categorías`,
              inline: true
            },
            {
              name: '📅 Información del Backup',
              value: `**Creado:** ${new Date(backupData.timestamp).toLocaleString('es-ES')}\n**ID:** \`${backupData.backupId}\``,
              inline: true
            }
          ],
          footer: {
            text: 'Información del Backup • Sistema de Backups'
          },
          timestamp: new Date().toISOString()
        };
        
        if (rolesList) {
          infoEmbed.fields.push({
            name: `🎭 Roles (${backupData.roles.length > 10 ? '10 de ' + backupData.roles.length : backupData.roles.length})`,
            value: rolesList || 'Ninguno',
            inline: true
          });
        }
        
        if (channelsList) {
          infoEmbed.fields.push({
            name: `💬 Canales (${backupData.channels.length > 10 ? '10 de ' + backupData.channels.length : backupData.channels.length})`,
            value: channelsList || 'Ninguno',
            inline: true
          });
        }
        
        if (categoriesList) {
          infoEmbed.fields.push({
            name: `📁 Categorías (${backupData.categories.length > 5 ? '5 de ' + backupData.categories.length : backupData.categories.length})`,
            value: categoriesList || 'Ninguna',
            inline: true
          });
        }
        
        await interaction.editReply({ embeds: [infoEmbed] });
        
      } catch (error) {
        console.error('Error getting backup info:', error);
        await interaction.editReply({
          content: '❌ Error al obtener la información del backup.'
        });
      }
    }
  }
  
  if (interaction.commandName === 'mute') {
    // Check if user has ban permissions (equivalent to moderate permissions)
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return await interaction.reply({
        content: '❌ Necesitas permisos de moderación para usar este comando.',
        ephemeral: true
      });
    }
    
    const targetUser = interaction.options.getUser('usuario');
    const timeStr = interaction.options.getString('tiempo') || '1h';
    const reason = interaction.options.getString('razon') || 'No se especificó razón';
    
    if (!targetUser) {
      return await interaction.reply({
        content: '❌ Debes especificar un usuario para mutear.',
        ephemeral: true
      });
    }
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return await interaction.reply({
        content: '❌ No se pudo encontrar ese usuario en el servidor.',
        ephemeral: true
      });
    }
    
    // Prevent muting administrators or users with higher roles
    if (targetMember.permissions.has(PermissionFlagsBits.Administrator) || 
        targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return await interaction.reply({
        content: '❌ No puedes mutear a este usuario (tiene permisos administrativos o un rol superior).',
        ephemeral: true
      });
    }
    
    try {
      const guild = interaction.guild;
      
      // Find or create the "Muted" role
      let mutedRole = guild.roles.cache.find(role => role.name === 'Muted');
      
      if (!mutedRole) {
        mutedRole = await guild.roles.create({
          name: 'Muted',
          color: '#808080',
          permissions: [],
          reason: 'Rol de mute creado por el bot'
        });
        
        // Set permissions for all text channels
        guild.channels.cache.forEach(async (channel) => {
          if (channel.type === ChannelType.GuildText) {
            try {
              await channel.permissionOverwrites.create(mutedRole, {
                SendMessages: false,
                AddReactions: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
              });
            } catch (error) {
              console.error(`Error setting permissions for channel ${channel.name}:`, error);
            }
          }
        });
      }
      
      // Check if user is already muted
      if (targetMember.roles.cache.has(mutedRole.id)) {
        return await interaction.reply({
          content: '❌ Este usuario ya está muteado.',
          ephemeral: true
        });
      }
      
      // Parse time duration
      const duration = parseTime(timeStr);
      if (duration === null) {
        return await interaction.reply({
          content: '❌ Formato de tiempo inválido. Usa: 1m, 5h, 2d, etc.',
          ephemeral: true
        });
      }
      
      // Add muted role
      await targetMember.roles.add(mutedRole);
      
      const muteEmbed = {
        title: '🔇 Usuario Muteado',
        description: `**${targetUser.tag}** ha sido muteado exitosamente`,
        color: 0xFF4500,
        fields: [
          {
            name: '👤 Usuario',
            value: `${targetUser} (${targetUser.tag})`,
            inline: true
          },
          {
            name: '⏰ Duración',
            value: timeStr,
            inline: true
          },
          {
            name: '👮 Moderador',
            value: `${interaction.user.tag}`,
            inline: true
          },
          {
            name: '📋 Razón',
            value: reason,
            inline: false
          },
          {
            name: '⏳ Expira',
            value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`,
            inline: false
          }
        ],
        footer: {
          text: 'Sistema de Moderación'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.reply({ embeds: [muteEmbed] });
      
      // Try to DM the user
      try {
        await targetUser.send({
          embeds: [{
            title: '🔇 Has sido muteado',
            description: `Has sido muteado en **${guild.name}**`,
            color: 0xFF4500,
            fields: [
              {
                name: '⏰ Duración',
                value: timeStr,
                inline: true
              },
              {
                name: '📋 Razón',
                value: reason,
                inline: false
              },
              {
                name: '⏳ Expira',
                value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`,
                inline: false
              }
            ]
          }]
        });
      } catch (dmError) {
        console.log(`Could not DM ${targetUser.tag} about mute`);
      }
      
      // Schedule auto-unmute
      setTimeout(async () => {
        try {
          const member = await guild.members.fetch(targetUser.id).catch(() => null);
          if (member && member.roles.cache.has(mutedRole.id)) {
            await member.roles.remove(mutedRole);
            console.log(`Auto-unmuted ${targetUser.tag}`);
          }
        } catch (error) {
          console.error(`Error auto-unmuting ${targetUser.tag}:`, error);
        }
      }, duration);
      
    } catch (error) {
      console.error('Error muting user:', error);
      await interaction.reply({
        content: '❌ Error al mutear al usuario. Verifica que el bot tenga permisos suficientes.',
        ephemeral: true
      });
    }
  }
  
  if (interaction.commandName === 'unmute') {
    // Check if user has ban permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return await interaction.reply({
        content: '❌ Necesitas permisos de moderación para usar este comando.',
        ephemeral: true
      });
    }
    
    const targetUser = interaction.options.getUser('usuario');
    
    if (!targetUser) {
      return await interaction.reply({
        content: '❌ Debes especificar un usuario para desmutear.',
        ephemeral: true
      });
    }
    
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!targetMember) {
      return await interaction.reply({
        content: '❌ No se pudo encontrar ese usuario en el servidor.',
        ephemeral: true
      });
    }
    
    try {
      const guild = interaction.guild;
      const mutedRole = guild.roles.cache.find(role => role.name === 'Muted');
      
      if (!mutedRole) {
        return await interaction.reply({
          content: '❌ No se encontró el rol de mute en este servidor.',
          ephemeral: true
        });
      }
      
      if (!targetMember.roles.cache.has(mutedRole.id)) {
        return await interaction.reply({
          content: '❌ Este usuario no está muteado.',
          ephemeral: true
        });
      }
      
      await targetMember.roles.remove(mutedRole);
      
      const unmuteEmbed = {
        title: '🔊 Usuario Desmuteado',
        description: `**${targetUser.tag}** ha sido desmuteado exitosamente`,
        color: 0x00FF00,
        fields: [
          {
            name: '👤 Usuario',
            value: `${targetUser} (${targetUser.tag})`,
            inline: true
          },
          {
            name: '👮 Moderador',
            value: `${interaction.user.tag}`,
            inline: true
          }
        ],
        footer: {
          text: 'Sistema de Moderación'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.reply({ embeds: [unmuteEmbed] });
      
      // Try to DM the user
      try {
        await targetUser.send({
          embeds: [{
            title: '🔊 Has sido desmuteado',
            description: `Tu mute ha sido removido en **${guild.name}**.\n\nAhora puedes escribir mensajes normalmente.`,
            color: 0x00FF00
          }]
        });
      } catch (dmError) {
        console.log(`Could not DM ${targetUser.tag} about unmute`);
      }
      
    } catch (error) {
      console.error('Error unmuting user:', error);
      await interaction.reply({
        content: '❌ Error al desmutear al usuario.',
        ephemeral: true
      });
    }
  }
  
  if (interaction.commandName === 'config') {
    const subcommand = interaction.options.getSubcommand();
    
    // Check if user has administrator permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await interaction.reply({
        content: '❌ Necesitas permisos de administrador para acceder a la configuración general.',
        ephemeral: true
      });
    }
    
    if (subcommand === 'view') {
      const config = await loadConfig(interaction.guild.id);
      
      const viewEmbed = {
        title: '⚙️ Configuración General del Bot',
        description: `Configuración completa del bot en **${interaction.guild.name}**`,
        color: 0x5865F2,
        fields: [
          {
            name: '🎫 Sistema de Tickets',
            value: `**Estado:** Activo\n**Staff Roles:** ${config.tickets.staffRoles.join(', ')}`,
            inline: false
          },
          {
            name: '🔒 Auto-roles',
            value: `**Estado:** ${config.autoroles.enabled ? '✅ Activado' : '❌ Desactivado'}\n**Roles:** ${config.autoroles.roles.join(', ')}\n**DM Bienvenida:** ${config.autoroles.sendDM ? 'Sí' : 'No'}`,
            inline: false
          },
          {
            name: '🛡️ Sistema de Captcha',
            value: `**Estado:** ${config.captcha.enabled ? '✅ Activado' : '❌ Desactivado'}\n**Tipo:** ${config.captcha.type}\n**Rol Verificado:** ${config.captcha.verifiedRole}`,
            inline: false
          }
        ],
        footer: {
          text: 'Usa los comandos específicos para modificar cada configuración'
        },
        timestamp: new Date().toISOString()
      };
      
      await interaction.reply({ embeds: [viewEmbed], ephemeral: true });
    }
    
    if (subcommand === 'reset') {
      const modulo = interaction.options.getString('modulo');
      
      try {
        let config = await loadConfig(interaction.guild.id);
        const defaultConfig = getDefaultConfig();
        
        switch (modulo) {
          case 'all':
            config = defaultConfig;
            break;
          case 'tickets':
            config.tickets = defaultConfig.tickets;
            break;
          case 'autoroles':
            config.autoroles = defaultConfig.autoroles;
            break;
          case 'captcha':
            config.captcha = defaultConfig.captcha;
            break;
        }
        
        await saveConfig(interaction.guild.id, config);
        
        const resetEmbed = {
          title: '🔄 Configuración Reseteada',
          description: `La configuración de **${modulo === 'all' ? 'todos los módulos' : modulo}** ha sido reseteada a los valores predeterminados.`,
          color: 0x00FF00,
          footer: {
            text: 'Configuración guardada exitosamente'
          },
          timestamp: new Date().toISOString()
        };
        
        await interaction.reply({ embeds: [resetEmbed], ephemeral: true });
        
      } catch (error) {
        console.error('Error resetting config:', error);
        await interaction.reply({
          content: '❌ Error al resetear la configuración.',
          ephemeral: true
        });
      }
    }
  }
  
  } // Cerrar el bloque if (interaction.isChatInputCommand())
  
  // Handle button interactions
  if (interaction.isButton()) {
    if (interaction.customId === 'create_ticket') {
      const guild = interaction.guild;
      const user = interaction.user;
      const config = await loadConfig(guild.id);
      
      // Check if user already has a ticket
      const existingTicket = guild.channels.cache.find(
        channel => channel.name === `ticket-${user.username.toLowerCase()}`
      );
      
      if (existingTicket) {
        return await interaction.reply({
          content: `❌ Ya tienes un ticket abierto: ${existingTicket}`,
          ephemeral: true
        });
      }
      
      try {
        // Create ticket channel
        const ticketChannel = await guild.channels.create({
          name: `ticket-${user.username.toLowerCase()}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionFlagsBits.ViewChannel],
            },
            {
              id: user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ],
            },
            {
              id: client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
              ],
            }
          ],
        });
        
        const welcomeEmbed = {
          title: config.tickets.welcomeTitle,
          description: config.tickets.welcomeDescription.replace('{user}', user.toString()),
          color: 0x00FF00,
          footer: {
            text: `Ticket creado por ${user.tag} • ${new Date().toLocaleString('es-ES')}`
          }
        };
        
        const closeButton = new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Cerrar Ticket')
          .setStyle(ButtonStyle.Danger);
          
        const claimButton = new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('✋ Tomar Ticket')
          .setStyle(ButtonStyle.Secondary);
        
        const row = new ActionRowBuilder()
          .addComponents(closeButton, claimButton);
        
        await ticketChannel.send({ 
          content: `${user}`, 
          embeds: [welcomeEmbed], 
          components: [row] 
        });
        
        await interaction.reply({
          content: `✅ Tu ticket ha sido creado: ${ticketChannel}`,
          ephemeral: true
        });
        
      } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
          content: '❌ Error al crear el ticket. Contacta a un administrador.',
          ephemeral: true
        });
      }
    }
    
    if (interaction.customId === 'close_ticket') {
      // Check if user has staff role
      if (!hasStaffRole(interaction.member)) {
        return await interaction.reply({
          content: '❌ Solo los miembros del staff (Staff, Captain, Reclutador, Colider, Lider, Founder) pueden cerrar tickets.',
          ephemeral: true
        });
      }
      
      const closeEmbed = {
        title: '🔒 Ticket Cerrado',
        description: `Ticket cerrado por ${interaction.user}\n\n**Fecha:** ${new Date().toLocaleString('es-ES')}\n\n*El canal se eliminará en 10 segundos...*`,
        color: 0xFF0000
      };
      
      await interaction.reply({ embeds: [closeEmbed] });
      
      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (error) {
          console.error('Error al eliminar el canal:', error);
        }
      }, 10000);
    }
    
    if (interaction.customId === 'claim_ticket') {
      const channelName = interaction.channel.name;
      
      // Extract the username from the channel name (format: ticket-username)
      if (channelName.startsWith('ticket-')) {
        const ticketOwnerUsername = channelName.substring(7); // Remove 'ticket-' prefix
        const currentUsername = interaction.user.username.toLowerCase();
        
        // Prevent ticket owner from claiming their own ticket
        if (ticketOwnerUsername === currentUsername) {
          return await interaction.reply({
            content: '❌ No puedes reclamar tu propio ticket. Este botón es para que el staff se haga cargo de tu consulta.',
            ephemeral: true
          });
        }
      }
      
      const claimEmbed = {
        title: '✋ Ticket Reclamado',
        description: `Este ticket ha sido tomado por ${interaction.user}\n\n**Staff asignado:** ${interaction.user.tag}\n**Fecha:** ${new Date().toLocaleString('es-ES')}`,
        color: 0xFFFF00,
        footer: {
          text: 'Ticket asignado • Staff notificado'
        }
      };
      
      await interaction.reply({ embeds: [claimEmbed] });
    }
  }
});

client.login(process.env.TOKEN);

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with PONG!'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles'),
  new SlashCommandBuilder()
    .setName('normativas')
    .setDescription('Muestra las últimas actualizaciones de las normativas de Discord'),
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets de soporte')
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('Crea un panel para que los usuarios puedan crear tickets'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('close')
        .setDescription('Cierra el ticket actual'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configura mensajes del sistema de tickets')
        .addStringOption(option =>
          option.setName('tipo')
            .setDescription('Tipo de mensaje a configurar')
            .setRequired(true)
            .addChoices(
              { name: 'Título del Panel', value: 'panel_title' },
              { name: 'Descripción del Panel', value: 'panel_desc' },
              { name: 'Título de Bienvenida', value: 'welcome_title' },
              { name: 'Descripción de Bienvenida', value: 'welcome_desc' }
            ))
        .addStringOption(option =>
          option.setName('mensaje')
            .setDescription('Nuevo texto del mensaje (usa {user} para mencionar al usuario)')
            .setRequired(true))),
  new SlashCommandBuilder()
    .setName('autoroles')
    .setDescription('Sistema de autoroles para nuevos miembros')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configura el sistema para asignar rol "." a nuevos miembros'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Prueba el sistema de autoroles (solo administradores)'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('Configura opciones avanzadas del sistema de autoroles')
        .addStringOption(option =>
          option.setName('opcion')
            .setDescription('Opción a configurar')
            .setRequired(true)
            .addChoices(
              { name: 'Activar/Desactivar Sistema', value: 'toggle' },
              { name: 'Agregar Rol', value: 'add_role' },
              { name: 'Mensaje de Bienvenida', value: 'welcome_msg' },
              { name: 'Activar DM de Bienvenida', value: 'dm_toggle' }
            ))
        .addStringOption(option =>
          option.setName('valor')
            .setDescription('Valor de la configuración (rol o mensaje)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Muestra la configuración actual del sistema de autoroles')),
  new SlashCommandBuilder()
    .setName('captcha')
    .setDescription('Sistema de captcha con reacciones para verificar usuarios')
    .addSubcommand(subcommand =>
      subcommand
        .setName('setup')
        .setDescription('Configura el mensaje de captcha con reacción ✅'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('role')
        .setDescription('Muestra información del rol de verificación y estadísticas')),
  new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Sistema de backup para respaldar configuración del servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('create')
        .setDescription('Crea un backup completo del servidor'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Muestra la lista de backups disponibles'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Muestra información detallada de un backup')
        .addStringOption(option =>
          option.setName('backup_id')
            .setDescription('ID del backup a consultar')
            .setRequired(true))),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutea a un usuario temporalmente')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a mutear')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tiempo')
        .setDescription('Duración del mute (ej: 1h, 30m, 2d)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('razon')
        .setDescription('Razón del mute')
        .setRequired(false)),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Desmutea a un usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a desmutear')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configuración general del bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('Ver toda la configuración actual del bot'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Resetear configuración a valores predeterminados')
        .addStringOption(option =>
          option.setName('modulo')
            .setDescription('Módulo a resetear (o "all" para todo)')
            .setRequired(true)
            .addChoices(
              { name: 'Todo', value: 'all' },
              { name: 'Tickets', value: 'tickets' },
              { name: 'Auto-roles', value: 'autoroles' },
              { name: 'Captcha', value: 'captcha' }
            )))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Slash command registered!');
  } catch (error) {
    console.error(error);
  }
})();
