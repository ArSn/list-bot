const { sqlitefile } = require('./config.test.json');
const { DatabaseStructure } = require('./database-structure');

async function connectToTestDatabase() {
	const sqlite3 = require('sqlite3').verbose();
	const { open } = require('sqlite');

	return open({
		filename: sqlitefile,
		driver: sqlite3.Database,
	});
}

async function clearDatabase() {
	const testDb = await connectToTestDatabase();

	const dbStructure = new DatabaseStructure(testDb);
	await dbStructure.recreateDatabase();

	await testDb.close();
}

module.exports = {
	connectToTestDatabase,
	clearDatabase,
};
