const { List } = require('./list');

const { Item } = require('./item');
const { User } = require('./user');

class MessageHandler {

	constructor(client, db) {
		this.client = client;
		this.db = db;
	}

	respond(message, text) {
		const channel = this.client.channels.cache.get(message.channelId);
		channel.send(text);
		console.log('Response sent to channel: ' + text);
	}

	async handleMessage(message) {
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

		if (![
			'add',
			'newitem',
			'showlist',
			'showfulllist',
		].includes(command)) {
			console.log(`Unknown command "!${command}", ignoring.`);
			return;
		}

		let item_name, item_count;
		const list = new List(this.db);
		let discord_user = message.author;
		await list.ensureTableExists(); // todo: can we move this back to the class?

		switch (command) {
			case 'newitem': {
				item_name = tokenizedMessage.slice(1).join(' ');

				const item = new Item(this.db);
				if (await item.load(item_name)) {
					this.respond(message, item_name + ' ist bereits erlaubt.');
					return;
				}

				await item.create(item_name);
				this.respond(message, discord_user.username + ' hat ein neues Item hinzugefügt: ' + item_name);
				break;
			}
			case 'showlist': {
				const username_param = tokenizedMessage[1];
				const user = new User(this.db);

				if (username_param) {
					await user.loadByUserName(username_param);
					if (!user.id) {
						this.respond(message, 'User ' + username_param + ' nicht gefunden.');
						break;
					}

					discord_user = await this.client.users.fetch(user.id);
					if (!discord_user) {
						this.respond(message, 'Error: User found in database but not in discord API. Please contact admin.');
						break;
					}
				}

				// We don't really need to load it again but what the heck, avoids an extra if to not check
				await user.load(discord_user.id);

				const counterList = await user.getCounterList();

				if (!counterList.length) {
					this.respond(message, discord_user.username + ' hat keine Items auf der Liste.');
					break;
				}

				let response = discord_user.username + ' hat folgende Items auf der Liste:\n';
				counterList.forEach((row) => {
					response += '\n' + row.item_name + ': ' + row.counter;
				});
				this.respond(message, response);
				break;
			}
			case 'showfulllist': {
				const items = await list.getFullList();
				// todo: implement this
				break;
			}
			case 'add': {
				item_count = parseInt(tokenizedMessage[1]);
				item_name = tokenizedMessage.slice(2).join(' ');

				if (!item_count || !item_name) {
					this.respond(message, 'What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');
					break;
				}

				if (!await list.isItemAllowed(item_name)) {
					this.respond(message, 'Das Item "' + item_name + '" ist nicht erlaubt. Füge es erst mit !newitem <item_name> hinzu.');
					break;
				}

				await list.addToCounter(discord_user, item_name, item_count);
				const newCount = await list.getCount(discord_user, item_name);

				this.respond(message, `${discord_user.username} hat ${item_count} mal ${item_name} hinzugefügt. Stand jetzt: ${newCount}`);
				break;
			}
		}

		console.log('-------------------------------------------EOM-----------------------------------------------');
	}
}

module.exports = {
	MessageHandler,
};
