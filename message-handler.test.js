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

async function connectToTestDatabase() {
	const sqlite3 = require('sqlite3').verbose();
	const { open } = require('sqlite');

	return open({
		filename: sqlitefile,
		driver: sqlite3.Database,
	});
}

beforeEach(() => {
	// delete test database if it exists because we want to start with a clean slate every time
	const fs = require('fs');
	if (fs.existsSync(sqlitefile)) {
		fs.unlink(sqlitefile, (err) => {
			if (err) {
				console.error(err);
			}
		});
	}
});

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
			// todo: abstract the mocking a bit - this is very smiliar to the test above
			const testDb = await connectToTestDatabase();

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

});
