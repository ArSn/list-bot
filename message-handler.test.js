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
		});

		test('Ignores messages without content', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: '',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('No message content, ignoring.');
		});

		test('Ignores messages that are not commands', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: 'this is not a command but just a random message',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('Not a command, ignoring.');
		});

		test('Ignores messages with unknown commands', () => {
			const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());

			const messageHandler = createMessageHandlerWithEmptyMocks();
			const messageMock = {
				content: '!unknowncommand',
			};

			messageHandler.handleMessage(messageMock);

			expect(consoleLogSpy).toHaveBeenCalledWith('Unknown command "!unknowncommand", ignoring.');
		});
	});

	describe('Handles !newitem command', () => {


	});

});
