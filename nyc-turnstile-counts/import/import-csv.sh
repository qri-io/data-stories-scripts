#!/bin/bash

echo $1

psql postgresql://postgres:password@localhost << EOF

DROP TABLE IF EXISTS csv_$1;

CREATE TABLE csv_$1 (
  controlarea varchar,
  remoteunit varchar,
  subunit_channel_position varchar,
  station varchar,
  linenames varchar,
  division varchar,
  date varchar,
  time varchar,
  description varchar,
  entries integer,
  exits integer
);

\copy csv_$1 FROM '/Users/chriswhong/Sites/data-stories-scripts/nyc-turnstile-counts/source-csv/$1.csv' WITH DELIMITER ',' CSV HEADER;

INSERT INTO turnstile_observations
SELECT * FROM (
  SELECT
    DISTINCT CONCAT(controlarea, remoteunit, subunit_channel_position, TO_TIMESTAMP(EXTRACT(EPOCH FROM (date || ' ' || time)::timestamp at time zone 'America/New_York'))) AS id,
    CONCAT(controlarea, remoteunit, subunit_channel_position) AS unit_id,
    controlarea,
    remoteunit,
    subunit_channel_position,
    station,
    linenames,
    division,
    TO_TIMESTAMP(EXTRACT(EPOCH FROM (date || ' ' || time)::timestamp at time zone 'America/New_York')) AS observed_at,
    description,
    entries,
    exits,
    NULL::bigint as net_entries,
    NULL::bigint as net_exits,
    '$1.csv' as filename
  FROM csv_$1
) a
ORDER BY unit_id, observed_at
ON CONFLICT (id) DO NOTHING;

DROP TABLE csv_$1;

EOF
