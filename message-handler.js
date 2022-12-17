const { DatabaseStructure } = require('./database-structure');

const { Item } = require('./item');
const { User } = require('./user');
const { FullList } = require('./full-list');

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');


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
			'help',
			'add',
			'newitem',
			'showlist',
			'showfulllist',
			'deletelist',
		].includes(command)) {
			console.log(`Unknown command "!${command}", ignoring.`);
			return;
		}

		const dbStructure = new DatabaseStructure(this.db);
		await dbStructure.runStructureScript();

		let item_name, item_count;
		let discord_user = message.author;

		switch (command) {
			case 'help': {

				const helpText = `
					**!help** - Diese Hilfe anzeigen.
					**!add <item_count> <item_name>** - Zähler für erlaubtes Item erhöhen.
					**!newitem <item_name>** - Neues Item erlauben.
					**!showlist** - Liste und Zähler aller Items für den aktuellen User anzeigen.
					**!showlist <user_name>** - Liste und Zähler aller Items für den angegebenen User anzeigen.
					**!showfulllist** - Liste und Zähler aller Items von allen Usern anzeigen.
					**!deletelist** - Liste und Zähler für den aktuellen User löschen.
				`;

				this.respond(message,
					helpText.replaceAll('\t', ''));
				break;
			}
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
				counterList.forEach((counter) => {
					response += '\n' + counter.item_name + ': ' + counter.counter;
				});
				this.respond(message, response);
				break;
			}
			case 'showfulllist': {

				const fullList = new FullList(this.db);
				const fullListItems = await fullList.getFullList();

				if (!fullListItems.length) {
					this.respond(message, 'Es steht noch nichts auf der Liste.');
					break;
				}

				// aggreagte the full list by item name
				const fullListAggregated = {};
				fullListItems.forEach((item) => {
					if (!fullListAggregated[item.item_name]) {
						fullListAggregated[item.item_name] = [];
					}
					fullListAggregated[item.item_name].push(item);
				});

				// print out username and counter for each item
				let response = 'Die Gesamtliste sieht wie folgt aus:\n';
				Object.keys(fullListAggregated).forEach((itemName) => {
					response += '\n' + itemName + ': \t';
					fullListAggregated[itemName].forEach((item) => {
						response += item.user_name + ': ' + item.counter + ', ';
					});
				});

				this.respond(message, response);
				break;
			}
			case 'add': {
				item_count = parseInt(tokenizedMessage[1]);
				item_name = tokenizedMessage.slice(2).join(' ');

				if (!item_count || !item_name) {
					this.respond(message, 'What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');
					break;
				}

				const item = new Item(this.db);
				if (!await item.load(item_name)) {
					this.respond(message, 'Das Item "' + item_name + '" ist nicht erlaubt. Füge es erst mit !newitem <item_name> hinzu.');
					break;
				}

				const user = new User(this.db);
				await user.load(discord_user.id);

				await user.incrementCounter(item.id, item_count);
				const newCount = await user.getCounter(item.id);

				this.respond(message, `${discord_user.username} hat ${item_count} mal ${item_name} hinzugefügt. Stand jetzt: ${newCount}`);
				break;
			}
			case 'deletelist': {

				const user = new User(this.db);
				if (!await user.load(discord_user.id)) {
					this.respond(message, 'Du hast noch keine Items auf der Liste.');
					break;
				}


				const filter = i => i.customId === 'delete-list' && i.user.id === discord_user.id;

				const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });


				collector.on('collect', async i => {
					// todo: delete the list
					await i.update({ content: 'LISTE IST GELÖSCHT!', components: [] });
				});




				const row = new ActionRowBuilder()
					.addComponents(
						new ButtonBuilder()
							.setCustomId('delete-list')
							.setLabel('JETZT LÖSCHEN')
							.setStyle(ButtonStyle.Danger),
					);

				// todo: show the list in order to confirm deletion
				const sentDeleteMessage = await message.reply({ content: 'Bist du dir sicher, dass du deine Liste löschen möchtest?', components: [row] });


				collector.on('end', (collected) => {

					if (collected.size === 0) {
						sentDeleteMessage.edit({
							content: 'Löschen abgebrochen. Bitte bestätige innerhalb von 60 Sekunden. Um es erneut zu versuchen gib wieder !deletelist ein.',
							components: [],
						});
					}

					// Nothing to do otherwise as the message is already deleted then.
				});
			}
		}

		console.log('-------------------------------------------EOM-----------------------------------------------');
	}

	async handleButtonClick(interaction) {


		console.log('-------------------------------------------SOM-----------------------------------------------');
		console.log('Button clicked: ' + interaction.customId);
		console.log('-------------------------------------------EOM-----------------------------------------------');
	}
}

module.exports = {
	MessageHandler,
};
