'use strict';

const { sqlitefile } = require('./config.test.json');
const path = require('path');
const fs = require('fs');
const { Item } = require('./item');

async function connectToTestDatabase() {
	const sqlite3 = require('sqlite3').verbose();
	const { open } = require('sqlite');

	return open({
		filename: sqlitefile,
		driver: sqlite3.Database,
	});
}

beforeEach(async () => {
	// delete test database if it exists because we want to start with a clean slate every time
	if (fs.existsSync(sqlitefile)) {
		fs.unlink(sqlitefile, (err) => {
			if (err) {
				console.error(err);
			}
		});
	}

	// get script from database structure file and run it
	const filePath = path.join(__dirname, 'database-structure.sql');
	const structureScript = fs.readFileSync(filePath, 'utf8');

	const testDb = await connectToTestDatabase();

	// Replace the linebreaks away and split into single commands to run them one by one
	for (const statement of structureScript.replace(/(\r\n|\n|\r)/gm, '').split(';')) {
		// Ignore empty statements
		if (statement) {
			await testDb.run(statement);
		}
	}

	await testDb.close();
});


describe('Item', () => {

	describe('create()', () => {

		test('should create a new item if it does not exist yet', async () => {
			const testDb = await connectToTestDatabase();

			const item = new Item(testDb);
			await item.create('wurstsalat');

			const result = await testDb.get('SELECT id, item_name FROM items WHERE item_name = ?', 'wurstsalat');

			expect(result).not.toBeNull();
			expect(result.item_name).toBe('wurstsalat');

			await testDb.close();
		});

		test('Does not create a new item with the same name if it already exists', async () => {
			const testDb = await connectToTestDatabase();

			const item = new Item(testDb);
			const firstTime = await item.create('wurstsalat');
			expect(firstTime).toBe(true);

			const secondTime = await item.create('wurstsalat');
			expect(secondTime).toBe(false);

			const result = await testDb.all('SELECT id, item_name FROM items WHERE item_name = ?', 'wurstsalat');

			expect(result).not.toBeNull();
			expect(result.length).toBe(1);

			await testDb.close();
		});
	});
});
