'use strict';

const { Item } = require('./item');

const { connectToTestDatabase, clearDatabase } = require('./test-utils');

beforeEach(async () => {
	await clearDatabase();
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
