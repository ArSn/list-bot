CREATE TABLE IF NOT EXISTS items
	(id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT);

CREATE UNIQUE INDEX IF NOT EXISTS items_item_name ON items (item_name);

CREATE TABLE IF NOT EXISTS users
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_name TEXT);

CREATE UNIQUE INDEX IF NOT EXISTS users_user_id ON users (user_id);


CREATE TABLE IF NOT EXISTS counters
    (id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    item_id INTEGER,
    counter INTEGER);

CREATE INDEX IF NOT EXISTS counters_user_id ON counters (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS counters_user_and_item_ids ON counters (user_id, item_id);
