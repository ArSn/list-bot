class List {

	constructor(sqliteDb) {
		this.db = sqliteDb;
	}

	async ensureTableExists() {

		// get script from database structure file and run it
		const fs = require('fs');
		const path = require('path');
		const filePath = path.join(__dirname, 'database-structure.sql');
		const structureScript = fs.readFileSync(filePath, 'utf8');

		// Replace the linebreaks away and split into single commands to run them one by one
		for (const statement of structureScript.replace(/(\r\n|\n|\r)/gm, '').split(';')) {
			// Ignore empty statements
			if (statement) {
				await this.db.run(statement);

			}
		}

		await this.db.run(structureScript);
	}

	async insertUserIfNew(user) {
		await this.db.run('INSERT OR IGNORE INTO users (user_id, user_name) VALUES (?, ?)', user.id, user.username);
	}

	async addToCounter(user, itemName, count) {
		await this.insertUserIfNew(user);
		const itemId = await this.getItemId(itemName);
		await this.db.run('INSERT OR IGNORE INTO counters (user_id, item_id, counter) VALUES (?, ?, 0)', user.id, itemId);
		await this.db.run('UPDATE counters SET counter = counter + ? WHERE user_id = ? AND item_id = ?', count, user.id, itemId);
	}

	async addNewAllowedItem(itemName) {
		await this.db.run('INSERT INTO items (item_name) VALUES (?)', itemName);
	}

	async isItemAllowed(itemName) {
		const result = await this.db.get('SELECT id FROM items WHERE item_name = ?', itemName);
		return !!result;
	}

	async getItemId(itemName) {
		const result = await this.db.get('SELECT id FROM items WHERE item_name = ?', itemName);
		return result.id;
	}

	async getListForUser(user) {
		return await this.db.all('SELECT item_name, counter FROM counters ' +
			'INNER JOIN items ON counters.item_id = items.id ' +
			'WHERE user_id = ?' +
			'ORDER BY items.item_name ASC', user.id);
	}

	async getFullList() {
		return await this.db.all('SELECT item_name, counter FROM counters ' +
			'INNER JOIN items ON counters.item_id = items.id ' +
			'ORDER BY items.item_name ASC');
	}

	async getUserIdByName(userName) {
		const result = await this.db.get('SELECT user_id FROM users WHERE user_name = ?', userName);
		if (!result) {
			return null;
		}
		return result.user_id;
	}

	async getCount(user, itemName) {
		const itemId = await this.getItemId(itemName);
		const result = await this.db.get('SELECT counter FROM counters WHERE user_id = ? AND item_id = ?', user.id, itemId);
		return result.counter;
	}
}

module.exports = {
	List,
};
