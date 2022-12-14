class Counter {
	constructor(user_id, item_id, item_name, counter) {
		this.user_id = user_id;
		this.item_id = item_id;
		this.item_name = item_name;
		this.counter = counter;
	}
}

module.exports = {
	Counter,
};
