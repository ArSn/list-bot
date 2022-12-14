class DatabaseStructure {

	constructor(sqliteDb) {
		this.db = sqliteDb;
	}

	async runStructureScript() {

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

}

module.exports = {
	DatabaseStructure,
};
