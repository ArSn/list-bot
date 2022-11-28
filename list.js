class List {

	constructor(sqliteDb) {
		this.db = sqliteDb;
	}

	async ensureTableExists() {
		await this.db.run('CREATE TABLE IF NOT EXISTS list (id INTEGER PRIMARY KEY AUTOINCREMENT, `name` TEXT, counter INTEGER)');
	}

	async addItem(itemName) {
		await this.db.run('INSERT INTO list (name, counter) VALUES (?, 0)', itemName);
	}

	async getList() {
		return await this.db.all('SELECT name, counter FROM list ORDER BY name ASC');
	}

	addCount( itemName, count ) {

	}
}

module.exports = {
	List
};
