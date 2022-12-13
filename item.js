class Item {
	constructor(db) {
		this.db = db;
		this.id = null;
		this.name = null;
	}

	// load item from database
	async load(name) {
		const result = await this.db.get('SELECT id, item_name FROM items WHERE item_name = ?', name);
		if (!result) {
			return false;
		}
		this.id = result.id;
		this.name = result.item_name;
		return true;
	}

	// create new item in database
	async create(name) {
		// We don't want to create it if it already exists
		if (await this.load(name)) {
			return false;
		}

		await this.db.run('INSERT INTO items (item_name) VALUES (?)', name);
		this.id = this.db.lastID;
		this.name = name;
		return true;
	}

}

module.exports = {
	Item,
};

