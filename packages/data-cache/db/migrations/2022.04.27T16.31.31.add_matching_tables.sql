CREATE TABLE match (
  id serial NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT current_timestamp,

  consumer_id text NOT NULL,
  generator_id text NOT NULL,
  volume int NOT NULL,
  timestamp timestamptz NOT NULL,
  consumer_metadata json NOT NULL,
  generator_metadata json NOT NULL
);

CREATE TABLE leftover_consumption (
  id serial NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT current_timestamp,

  consumer_id text NOT NULL,
  volume int NOT NULL,
  timestamp timestamptz NOT NULL,
  consumer_metadata json NOT NULL
);

CREATE TABLE leftover_generation (
  id serial NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT current_timestamp,

  generator_id text NOT NULL,
  volume int NOT NULL,
  timestamp timestamptz NOT NULL,
  generator_metadata json NOT NULL
);

