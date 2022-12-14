const { Counter } = require('./counter');

class User {
	constructor(db) {
		this.db = db;
		this.id = null;
		this.name = null;
	}

	async insertUserIfNew() {
		await this.db.run('INSERT OR IGNORE INTO users (user_id, user_name) VALUES (?, ?)', this.id, this.username);
	}

	async load(user_id) {
		const sql = 'SELECT * FROM users WHERE user_id = ?';
		const params = [user_id];
		const row = await this.db.get(sql, params);
		if (!row) {
			return false;
		}

		this.id = row.user_id;
		this.name = row.user_name;
		return true;
	}

	async loadByUserName(user_name) {
		const sql = 'SELECT * FROM users WHERE user_name = ?';
		const params = [user_name];
		const row = await this.db.get(sql, params);
		if (!row) {
			return false;
		}

		this.id = row.user_id;
		this.name = row.user_name;
		return true;
	}

	async getCounterList() {
		const sql = `SELECT * FROM counters
			LEFT JOIN items ON counters.item_id = items.id
			WHERE user_id = ?`;
		const params = [this.id];
		const rows = await this.db.all(sql, params);

		if (!rows) {
			return false;
		}

		const counterList = [];

		rows.forEach((row) => {
			counterList.push(new Counter(row.user_id, row.item_id, row.item_name, row.counter));
		});

		return counterList;
	}

	async getCounter(item_id) {
		const sql = `SELECT * FROM counters
			LEFT JOIN items ON counters.item_id = items.id
			WHERE user_id = ? AND item_id = ?`;
		const params = [this.id, item_id];
		const row = await this.db.get(sql, params);

		if (!row) {
			return 0;
		}

		return row.counter;
	}

	async incrementCounter(item_id, count_to_add) {
		await this.insertUserIfNew();

		let sql = 'INSERT OR IGNORE INTO counters (user_id, item_id, counter) VALUES (?, ?, 0)';
		let params = [this.id, item_id];
		await this.db.run(sql, params);

		sql = `UPDATE counters
			SET counter = counter + ?
			WHERE user_id = ? AND item_id = ?`;
		params = [count_to_add, this.id, item_id];
		await this.db.run(sql, params);

		return true;
	}

}

module.exports = {
	User,
};
