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

	let item_name, item_count;
	const list = new List(db);
	const user = message.author;
	await list.ensureTableExists(); // todo: can we move this back to the class?

	switch (command) {
		case 'newitem': {
			item_name = tokenizedMessage.slice(1).join(' ');

			if (await list.isItemAllowed(item_name)) {
				respond(item_name + ' ist bereits erlaubt.');
			}

			await list.addNewAllowedItem(item_name);
			respond(message, user.username + ' hat ein neues Item hinzugefügt: ' + item_name);
			break;
		}
		case 'showlist': {
			const items = await list.getListForUser(user);

			if (!items.length) {
				respond(message, 'Deine Liste ist leer.');
				break;
			}

			let response = 'Deine Liste sieht wie folgt aus: ';
			items.forEach((row) => {
				response += '\n' + row.item_name + ': ' + row.counter;
			});
			respond(message, response);
			break;
		}
		case 'showfulllist': {
			// todo: liste für ALLE use ranzeigen
			break;
		}
		case 'add': {
			item_count = parseInt(tokenizedMessage[1]);
			item_name = tokenizedMessage.slice(2).join(' ');

			if (!item_count || !item_name) {
				respond(message, 'What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');
				break;
			}

			if (!await list.isItemAllowed(item_name)) {
				respond(message, 'Das Item "' + item_name + '" ist nicht erlaubt. Füge es erst mit !newitem <item_name> hinzu.');
				break;
			}

			await list.addToCounter(user, item_name, item_count);
			const newCount = await list.getCount(user, item_name);

			respond(message, `${user.username} hat ${item_count} mal ${item_name} hinzugefügt. Stand jetzt: ${newCount}`);
			break;
		}
	}

	console.log('-------------------------------------------EOM-----------------------------------------------');
});

// Log in to Discord with your client's token
client.login(token);
