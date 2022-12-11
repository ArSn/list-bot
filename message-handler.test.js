'use strict';

const { MessageHandler } = require('./message-handler');


function createMessageHandlerWithEmptyMocks() {
	const clientMock = {
		channels: {
			cache: {
				get: jest.fn().mockReturnValue({
					send: jest.fn(),
				}),
			},
		},
	};

	const dbMock = {};

	return new MessageHandler(clientMock, dbMock);
}


const { sqlitefile } = require('./config.test.json');
const path = require('path');
const fs = require('fs');

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

function createSpiedOnMessageHandler(testDb) {
	const channelMock = {
		send: jest.fn(),
	};

	const channelSendSpy = jest.spyOn(channelMock, 'send').mockImplementation(jest.fn());

	const clientMock = {
		channels: {
			cache: {
				get: jest.fn().mockReturnValue(channelMock),
			},
		},
	};
	const messageHandler = new MessageHandler(clientMock, testDb);
	return { channelSendSpy, messageHandler };
}

describe('MessageHandler', () => {

	describe('Logs sensibly', () => {
		test('Logs every new message to the console', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: 'test',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('New Message incoming:', messageMock);

			consoleLogSpy.mockRestore();
		});

		test('Ignores messages without content', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: '',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('No message content, ignoring.');

			consoleLogSpy.mockRestore();
		});

		test('Ignores messages that are not commands', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: 'this is not a command but just a random message',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('Not a command, ignoring.');

			consoleLogSpy.mockRestore();
		});

		test('Ignores messages with unknown commands', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: '!unknowncommand',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('Unknown command "!unknowncommand", ignoring.');

			consoleLogSpy.mockRestore();
		});
	});

	describe('Handles !newitem command', () => {

		test('Adds new item to the database', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!newitem testitem',
				author: {
					username: 'horst',
				},
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('horst hat ein neues Item hinzugefügt: testitem');

			await testDb.close();
		});

		test('Does not add new item to the database if it already exists', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!newitem testitem',
				author: {
					username: 'horst',
				},
			};

			await messageHandler.handleMessage(messageMock);

			channelSendSpy.mockClear();
			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('testitem ist bereits erlaubt.');

			await testDb.close();
		});

	});

	describe('Handles !showlist <username> command', () => {
		test('Responds with user not found message if the user does not exist', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!showlist blubbelnase',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('User blubbelnase nicht gefunden.');

			await testDb.close();
		});

		test('Responds with empty list message if the user has no items', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'wurstkopf');

			const channelMock = {
				send: jest.fn(),
			};

			const channelSendSpy = jest.spyOn(channelMock, 'send').mockImplementation(jest.fn());

			const clientMock = {
				channels: {
					cache: {
						get: jest.fn().mockReturnValue(channelMock),
					},
				},
				users: {
					fetch: jest.fn().mockResolvedValue({
						id: 123,
						username: 'wurstkopf',
					}),
				},
			};
			const messageHandler = new MessageHandler(clientMock, testDb);

			const messageMock = {
				content: '!showlist wurstkopf',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('wurstkopf hat keine Items auf der Liste.');

			await testDb.close();
		});

		test('Responds with info to contact admin if the user can not be fetched from the discord API', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'horstkopf');

			const channelMock = {
				send: jest.fn(),
			};

			const channelSendSpy = jest.spyOn(channelMock, 'send').mockImplementation(jest.fn());

			const clientMock = {
				channels: {
					cache: {
						get: jest.fn().mockReturnValue(channelMock),
					},
				},
				users: {
					fetch: jest.fn().mockResolvedValue(null),
				},
			};
			const messageHandler = new MessageHandler(clientMock, testDb);

			const messageMock = {
				content: '!showlist horstkopf',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('Error: User found in database but not in discord API. Please contact admin.');

			await testDb.close();
		});
	});

});
