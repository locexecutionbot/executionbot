const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActivityType, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startKeepAlive } = require('./keep_alive');

// Start keep-alive system FIRST (before Discord client)
console.log('Starting keep-alive system...');
startKeepAlive();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Load or create data files
const dataPath = path.join(__dirname, 'executions.json');
const configPath = path.join(__dirname, 'config.json');
let executionsData = {};
let configData = {};

function loadData() {
  if (fs.existsSync(dataPath)) {
    const data = fs.readFileSync(dataPath, 'utf8');
    executionsData = JSON.parse(data);
  }
  if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath, 'utf8');
    configData = JSON.parse(data);
  }
}

function saveData() {
  fs.writeFileSync(dataPath, JSON.stringify(executionsData, null, 2));
  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
}

loadData();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  client.user.setPresence({
    activities: [{ name: 'discord.gg/locx', type: ActivityType.Watching }],
    status: 'online',
  });

  const commands = [
    {
      name: 'executionsetup',
      description: 'Set the execution channel (requires Manage Server permission)',
      options: [
        {
          name: 'channel',
          description: 'The channel where executions will be posted',
          type: 7,
          required: true,
          channel_types: [ChannelType.GuildText]
        }
      ]
    },
    {
      name: 'executionadd',
      description: 'Add an execution to the execution channel',
      options: [
        {
          name: 'user',
          description: 'The user who was executed',
          type: 6,
          required: true
        }
      ]
    },
    {
      name: 'executionremove',
      description: 'Remove your own execution',
      options: [
        {
          name: 'message-id',
          description: 'The message ID of the execution to remove',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'executionremovestaff',
      description: 'Remove any execution (requires Manage Messages permission)',
      options: [
        {
          name: 'message-id',
          description: 'The message ID of the execution to remove',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: 'executioncommands',
      description: 'Show all execution commands'
    }
  ];

  client.application.commands.set(commands);
  console.log('Slash commands registered!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user, channel, member } = interaction;

  try {
    if (commandName === 'executionsetup') {
      if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: 'You need the Manage Server permission to use this command!', ephemeral: true });
      }

      const executionChannel = options.getChannel('channel');
      
      if (!configData[interaction.guildId]) {
        configData[interaction.guildId] = {};
      }
      configData[interaction.guildId].executionChannelId = executionChannel.id;
      saveData();

      await interaction.reply({ content: ` Execution channel set to ${executionChannel}!`, ephemeral: true });

    } else if (commandName === 'executionadd') {
      const executionChannelId = configData[interaction.guildId]?.executionChannelId;
      
      if (!executionChannelId) {
        return interaction.reply({ content: 'Execution channel not set! Please ask an admin to use `/executionsetup` first.', ephemeral: true });
      }

      const executionChannel = await client.channels.fetch(executionChannelId);
      const executedUser = options.getUser('user');
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(' Execution')
        .setDescription(`**Executed:** ${executedUser}\n**Executor:** ${user}`)
        .setTimestamp()
        .setFooter({ text: 'discord.gg/locx' });

      const message = await executionChannel.send({ embeds: [embed] });
      await message.react('⬆️');
      await message.react('⬇️');

      if (!executionsData[interaction.guildId]) {
        executionsData[interaction.guildId] = {};
      }
      executionsData[interaction.guildId][message.id] = {
        executorId: user.id,
        executedUserId: executedUser.id,
        channelId: executionChannel.id,
        timestamp: Date.now()
      };
      saveData();

      await interaction.reply({ content: ` Execution added in ${executionChannel}!`, ephemeral: true });

    } else if (commandName === 'executionremove') {
      const messageId = options.getString('message-id');
      
      if (!executionsData[interaction.guildId]?.[messageId]) {
        return interaction.reply({ content: ' Execution not found!', ephemeral: true });
      }

      if (executionsData[interaction.guildId][messageId].executorId !== user.id) {
        return interaction.reply({ content: 'You can only remove your own executions!', ephemeral: true });
      }

      try {
        const executionChannel = await client.channels.fetch(executionsData[interaction.guildId][messageId].channelId);
        const message = await executionChannel.messages.fetch(messageId);
        await message.delete();
        
        delete executionsData[interaction.guildId][messageId];
        saveData();
        
        await interaction.reply({ content: ' Execution removed successfully!', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: ' Could not find or delete the execution message!', ephemeral: true });
      }

    } else if (commandName === 'executionremovestaff') {
      if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ content: 'You need the Manage Messages permission to use this command!', ephemeral: true });
      }

      const messageId = options.getString('message-id');
      
      if (!executionsData[interaction.guildId]?.[messageId]) {
        return interaction.reply({ content: ' Execution not found!', ephemeral: true });
      }

      try {
        const executionChannel = await client.channels.fetch(executionsData[interaction.guildId][messageId].channelId);
        const message = await executionChannel.messages.fetch(messageId);
        await message.delete();
        
        delete executionsData[interaction.guildId][messageId];
        saveData();
        
        await interaction.reply({ content: 'Execution removed successfully!', ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: ' Could not find or delete the execution message!', ephemeral: true });
      }

    } else if (commandName === 'executioncommands') {
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(' Execution Commands')
        .setDescription('Here are all available execution commands:')
        .addFields(
          { name: '/executionsetup <channel>', value: 'Set the execution channel (requires Manage Server permission)' },
          { name: '/executionadd <user>', value: 'Add an execution to the execution channel (with ⬆️ and ⬇️ reactions)' },
          { name: '/executionremove <message-id>', value: 'Remove your own execution' },
          { name: '/executionremovestaff <message-id>', value: 'Remove any execution (requires Manage Messages permission)' },
          { name: '/executioncommands', value: 'Show this help message' }
        )
        .setFooter({ text: 'discord.gg/locx' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    console.error('Error handling command:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: ' An error occurred while executing the command.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
