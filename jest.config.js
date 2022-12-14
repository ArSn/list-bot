/** @type {import('jest').Config} */
// we can only open one thread to the sqlite database at a time, so maxWorkers needs to be 1 for now.
const config = {
	verbose: true,
	maxWorkers: 1,
};

module.exports = config;
