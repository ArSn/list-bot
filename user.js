const {Counter} = require("./counter");

class User {
	constructor(db) {
		this.db = db;
		this.internal_id = null;
		this.id = null;
		this.name = null;
	}

	// async create(id, name) {
	// 	const sql = 'INSERT INTO users (user_id, user_name) VALUES (?, ?)';
	// 	const params = [id, name];
	// 	return this.db.run(sql, params);
	// }

	async load(user_id) {
		const sql = 'SELECT * FROM users WHERE user_id = ?';
		const params = [user_id];
		const row = await this.db.get(sql, params);
		if (!row) {
			return false;
		}

		this.internal_id = row.id;
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

		this.internal_id = row.id;
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
			const counter = new Counter();
			counter.create(row.user_id, row.item_id, row.item_name, row.counter);
			counterList.push(counter);
		});

		return counterList;
	}

}

module.exports = {
	User,
};
