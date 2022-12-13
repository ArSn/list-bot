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


	async getUserIdByName(userName) {
		const result = await this.db.get('SELECT user_id FROM users WHERE user_name = ?', userName);
		if (!result) {
			return null;
		}
		return result.user_id;
	}

}


module.exports = {
	User,
};
