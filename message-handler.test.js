'use strict';

const { MessageHandler } = require('./message-handler');
const { connectToTestDatabase, clearDatabase } = require('./test-utils');


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

beforeEach(async () => {
	await clearDatabase();
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

		test('Responds with list of items if the user has items', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'horstkopf');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 1, 'testitem1');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 2, 'testitem2');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 3, 'testitem3');
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 1, 5);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 2, 10);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 3, 15);

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
						username: 'horstkopf',
					}),
				},
			};
			const messageHandler = new MessageHandler(clientMock, testDb);

			const messageMock = {
				content: '!showlist horstkopf',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('horstkopf hat folgende Items auf der Liste:\n' +
				'\ntestitem1: 5' +
				'\ntestitem2: 10' +
				'\ntestitem3: 15',
			);

			await testDb.close();
		});
	});

	describe('Handles !showlist command', () => {
		test('Responds with list of items of the user sending the message if the user has items', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'wurstnasenkopf');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 1, 'testitem1');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 2, 'testitem2');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 3, 'testitem3');
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 1, 5);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 2, 10);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 3, 15);

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!showlist',
				author: {
					id: 123,
					username: 'wurstnasenkopf',
				},
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('wurstnasenkopf hat folgende Items auf der Liste:\n' +
				'\ntestitem1: 5' +
				'\ntestitem2: 10' +
				'\ntestitem3: 15',
			);

			await testDb.close();
		});
	});

	describe('Handles !showfulllist command', () => {
		test('Responds with an empty list message if there are no counters on the list', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!showfulllist',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('Es steht noch nichts auf der Liste.');

			await testDb.close();
		});

		test('Responds with list of items if there are items on the list', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'horstkopf');
			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 456, 'wurstnasenkopf');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 1, 'testitem1');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 2, 'testitem2');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 3, 'testitem3');
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 1, 5);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 123, 2, 10);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 456, 2, 23);
			await testDb.run('INSERT INTO counters (user_id, item_id, counter) VALUES (?, ?, ?)', 456, 3, 15);

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!showfulllist',
			};

			await messageHandler.handleMessage(messageMock);

			expect(channelSendSpy).toHaveBeenCalledWith('Die Gesamtliste sieht wie folgt aus:\n\n' +
				'testitem1: \thorstkopf: 5, \n' +
				'testitem2: \thorstkopf: 10, wurstnasenkopf: 23, \n' +
				'testitem3: \twurstnasenkopf: 15, ',
			);

			await testDb.close();
		});
	});

	describe('Handles !add command', () => {
		test('Responds with error if the syntax of the command is wrong', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!add',
			};
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');
			channelSendSpy.mockClear();

			messageMock.content = '!add 23';
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');
			channelSendSpy.mockClear();

			messageMock.content = '!add waffeln';
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('What? Schreibweise zum hinzufügen ist: !add <Anzahl> <Item>');

			await testDb.close();
		});

		test('Responds with error if the item is not allowed', async () => {
			const testDb = await connectToTestDatabase();

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!add 14 kuchen',
			};
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('Das Item "kuchen" ist nicht erlaubt. Füge es erst mit !newitem <item_name> hinzu.');

			await testDb.close();
		});

		test('Adds the item to the list of the user if the item is allowed and returns the new counter', async () => {
			const testDb = await connectToTestDatabase();

			await testDb.run('INSERT INTO users (user_id, user_name) VALUES (?, ?)', 123, 'listhaver');
			await testDb.run('INSERT INTO items (id, item_name) VALUES (?, ?)', 1, 'salat');

			const { channelSendSpy, messageHandler } = createSpiedOnMessageHandler(testDb);

			const messageMock = {
				content: '!add 1 salat',
				author: {
					id: 123,
					username: 'listhaver',
				},
			};
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('listhaver hat 1 mal salat hinzugefügt. Stand jetzt: 1');
			channelSendSpy.mockClear();

			messageMock.content = '!add 2 salat';
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('listhaver hat 2 mal salat hinzugefügt. Stand jetzt: 3');
			channelSendSpy.mockClear();

			messageMock.content = '!add 5 salat';
			await messageHandler.handleMessage(messageMock);
			expect(channelSendSpy).toHaveBeenCalledWith('listhaver hat 5 mal salat hinzugefügt. Stand jetzt: 8');

			await testDb.close();
		});
	});

});
