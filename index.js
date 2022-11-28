// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

(async () => {
	db = await open({
		filename: './list-bot.sqlite',
		driver: sqlite3.Database,
	});
})();

const { List } = require('./list');

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

function respond(message, text) {
	const channel = client.channels.cache.get(message.channelId);
	channel.send(text);
	console.log('Response sent to channel: ' + text);
}

client.on(Events.MessageCreate, async (message) => {
	console.log('---------------------------------------------------------------------------------------------');
	console.log('New Message incoming:', message);


	if (!message.content) {
		console.log('No message content, ignoring.');
		return;
	}

	if (message.content.substring(0, 1) !== '!') {
		console.log('Not a command, ignoring.');
		return;
	}

	const tokenizedMessage = message.content.trim().split(/\s+/);
	const command = tokenizedMessage[0].substring(1);

	if (!['add', 'newitem', 'showlist', 'resetlist'].includes(command)) {
		console.log(`Unknown command "!${command}", ignoring.`);
		return;
	}

	let name, count;
	const list = new List(db);
	const username = message.author.username;
	await list.ensureTableExists(); // todo: can we move this back to the class?

	switch (command) {
		case 'newitem': {
			name = tokenizedMessage.slice(1).join(' ');
			// todo: take care of cases where the item already exists, return the current counter as well
			await list.addItem(name);
			respond(message, username + ' hat ein neues Item hinzugefügt: ' + name);
			break;
		}
		case 'showlist': {
			const items = await list.getList();
			let response = 'Die Liste sieht wie folgt aus: ';
			items.forEach((item) => {
				response += '\n' + item.name + ': ' + item.counter;
			});
			respond(message, response);
			break;
		}
		case 'add': {
			count = parseInt(tokenizedMessage[1]);
			name = tokenizedMessage.slice(2).join(' ');

			await list.addCount(name, count);
			const newCount = await list.getCount(name);

			respond(message, `${username} hat ${count} mal ${name} hinzugefügt. Stand jetzt: ${newCount}`);
			break;
		}
	}

	console.log('-------------------------------------------EOM-----------------------------------------------');
});

// Log in to Discord with your client's token
client.login(token);
