class List {

	constructor(sqliteDb) {
		this.db = sqliteDb;
	}

	async ensureTableExists() {

		// allowed items
		await this.db.run('CREATE TABLE IF NOT EXISTS items ' +
			'(id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
			'item_name TEXT)');

		await this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS items_item_name ON items (item_name)');

		// users
		await this.db.run('CREATE TABLE IF NOT EXISTS users ' +
			'(id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
			'user_id TEXT, ' +
			'user_name TEXT)');

		await this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS users_user_id ON users (user_id)');

		// counters
		await this.db.run('CREATE TABLE IF NOT EXISTS counters ' +
			'(id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
			'user_id TEXT, ' +
			'item_id INTEGER, ' +
			'counter INTEGER)');

		await this.db.run('CREATE INDEX IF NOT EXISTS counters_user_id ON counters (user_id)');
		await this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS counters_user_and_item_ids ON counters (user_id, item_id)');
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
