class FullList {
	constructor(db) {
		this.db = db;
	}

	async getFullList() {
		// get a list of all users combined with all items through the counters relation
		const sql = `
			SELECT * FROM
                counters
			INNER JOIN
				 users ON users.user_id = counters.user_id
			LEFT JOIN
				items ON items.id = counters.item_id
			ORDER BY
				users.user_name ASC,
				items.item_name ASC
		`;
		const rows = await this.db.all(sql);

		if (!rows) {
			return false;
		}

		return rows;
	}
}

module.exports = {
	FullList,
};
