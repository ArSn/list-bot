// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { MessageHandler } = require('./message-handler.js');

const configName = process.argv[2] ? process.argv[2] : './config.json';

// check if the config file exists
const fs = require('fs');
if (!fs.existsSync(configName)) {
	console.log('Config file ' + configName + ' not found. Exiting.');
	process.exit(1);
}

const { token } = require(configName);
console.log('Running with config: ' + configName);


const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');


// We need to be async in order to await things
(async () => {

	const db = await open({
		filename: './list-bot.sqlite',
		driver: sqlite3.Database,
	});


	// Create a new client instance
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});


	// When the client is ready, run this code (only once)
	// We use 'c' for the event parameter to keep it separate from the already defined 'client'
	client.once(Events.ClientReady, c => {
		console.log(`Ready! Logged in as ${c.user.tag}`);
	});


	const messageHandler = new MessageHandler(client, db);
	client.on(Events.MessageCreate, (message) => messageHandler.handleMessage(message));

	// Log in to Discord with your client's token
	client.login(token);


})();
