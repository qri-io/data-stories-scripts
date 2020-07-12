# Data Pipeline for Updating NYC Turnstile Data

## create turnstile_observations

Create a table to store ALL the turnstile observations, with indices.  New data will be appended to this after it is cleaned, and aggregate tables will be built from it.

### inspired by https://github.com/toddwschneider/nyc-subway-turnstile-data/blob/ce91733c4f00a6a7544bc32e3d494da0b970e71d/db/schema.rb

```
CREATE TABLE turnstile_observations (
  id varchar NOT NULL,
  unit_id varchar NOT NULL,
  controlarea varchar NOT NULL,
  remoteunit varchar NOT NULL,
  subunit_channel_position varchar NOT NULL,
  station varchar NOT NULL,
  linenames varchar NOT NULL,
  division varchar NOT NULL,
  observed_at timestamp NOT NULL,
  description varchar NOT NULL,
  entries bigint NOT NULL,
  exits bigint NOT NULL,
  net_entries bigint,
  net_exits bigint,
  filename varchar NOT NULL
);


CREATE UNIQUE INDEX idx_turnstile_observations_id
ON turnstile_observations(id);

CREATE INDEX idx_turnstile_observations_unit_id
ON turnstile_observations(unit_id);

CREATE INDEX idx_turnstile_observations_net_entries
ON turnstile_observations(net_entries);

CREATE INDEX idx_turnstile_observations_net_exits
ON turnstile_observations(net_exits);

CREATE INDEX idx_turnstile_observations_unit_id_observed_at
ON turnstile_observations(unit_id, observed_at);
```

## Import weekly CSVs

### Shell Scripts

For bulk import (these were only used the first time for adding 2019 and 2020 data):

`import/download-csv-sh` will download the csv corresponding with each week

`import/import.sh` will run `import-csv.sh` for each week

#### import-csv.sh

Import a single CSV using `import/import-csv.sh TIMESTAMP`

import-csv will create a temporary table for the data, copy the raw data from the csv, and INSERT it into `turnstile_observations` with the appropriate transformations and filters:

- remove duplicate entries for the same turnstile and timestamp
- create `id` and `unit_id` from existing fields
- combine `time` and `date` strings into a real time field `observed_at`


Once new data has been inserted, update the net_entries and net_exits with this query:

(Took 40:15 on all 13.5M rows, maybe faster if the UPDATE only happens WHERE entries/exits are null?  The CTE only takes 1 minute)

```
SET work_mem = '256MB';
WITH net_observations AS (
SELECT
   id,
   entries - lag(entries, 1) OVER w AS calculated_net_entries,
   exits - lag(exits, 1) OVER w AS calculated_net_exits
 FROM turnstile_observations
 WINDOW w AS (PARTITION BY unit_id ORDER BY observed_at)
)
UPDATE turnstile_observations
SET
 net_entries = CASE WHEN abs(calculated_net_entries) < 10000 THEN abs(calculated_net_entries) END,
 net_exits = CASE WHEN abs(calculated_net_exits) < 10000 THEN abs(calculated_net_exits) END
FROM net_observations
WHERE turnstile_observations.id = net_observations.id
AND net_entries IS NULL;
```

Ran in 3 minutes, 20 seconds

## Daily Counts by individual turnstile

Now aggregate into daily counts for each unit_id.
Add 2 hours to observed_at for deciding which date it should fall into.  (midnight falls to following day, meaning a 4-hour observation period ending at midnight gets counted on the next day, which is bad.  With a 2 hour offset, observations through 1:59am will count to the previous day)

Took 1:35 on 13.5M rows

```
DROP TABLE IF EXISTS daily_subunit;
CREATE TABLE daily_subunit AS (
  SELECT
    unit_id,
    (array_agg(remoteunit))[1] AS remoteunit,
    date_trunc('day', observed_at + interval '2h')::date AS date,
    SUM(net_entries) AS entries,
    SUM(net_exits) AS exits
  FROM turnstile_observations
  GROUP BY unit_id, date_trunc('day', observed_at + interval '2h')
);
```

## Daily Counts by station/station complex

Now aggregate units up to stations/complexes, join with remote_complex_lookup to find the station/complex that corresponds with the remoteunit

(Took 6 seconds to execute)

```
DROP table if exists daily_complex;
CREATE TABLE daily_complex AS (
	SELECT
    complex_id,
    date,
  	sum(entries) as entries,
  	sum(exits) as exits
	FROM (
    SELECT
      CASE
        WHEN unique_remotes.complex_id IS NULL
        THEN remoteunit
        ELSE unique_remotes.complex_id::text
      END,
	    remoteunit,
      date,
      entries,
	    exits
    FROM daily_subunit
    LEFT JOIN (
      SELECT DISTINCT ON (remote) * FROM remote_complex_lookup
    ) unique_remotes
    ON daily_subunit.remoteunit = unique_remotes.remote
  ) a
	GROUP BY complex_id, date
)
```

Now for a final cut, joined with `stations` for convenience columns.  All dates for 2019:

```
DROP TABLE IF EXISTS daily_counts_2019;
CREATE TABLE daily_counts_2019 AS (
  SELECT
    b.stop_name,
    b.daytime_routes,
    b.division,
    b.line,
    b.borough,
    b.structure,
    b.gtfs_longitude,
    b.gtfs_latitude,
    a.*
  FROM daily_complex a
  LEFT JOIN (
   SELECT
    DISTINCT ON ("complex id")
    "complex id" AS complex_id,
    "stop name" AS stop_name,
    "daytime routes" AS daytime_routes,
    division,
    line,
    borough,
    structure,
    "gtfs longitude" AS gtfs_longitude,
    "gtfs latitude" AS gtfs_latitude
   FROM stations
  ) b
  ON a.complex_id = b.complex_id
  WHERE date >= '2019-01-01'::date
   AND date < '2020-01-01'
)
```

159384 rows


And the same for 2020 YTD:

```
DROP TABLE IF EXISTS daily_counts_2020;
CREATE TABLE daily_counts_2020 AS (
  SELECT
    b.stop_name,
    b.daytime_routes,
    b.division,
    b.line,
    b.borough,
    b.structure,
    b.gtfs_longitude,
    b.gtfs_latitude,
    a.*
  FROM daily_complex a
  LEFT JOIN (
   SELECT
    DISTINCT ON ("complex id")
    "complex id" AS complex_id,
    "stop name" AS stop_name,
    "daytime routes" AS daytime_routes,
    division,
    line,
    borough,
    structure,
    "gtfs longitude" AS gtfs_longitude,
    "gtfs latitude" AS gtfs_latitude
   FROM stations
  ) b
  ON a.complex_id = b.complex_id
  WHERE date >= '2020-01-01'::date
   AND date < '2021-01-01'
)

```

# Weekly Update

1. Run `sh update-database.sh YYMMDD` for the date of the new CSV
2. Be sure to switch to the correct qri username (nyc-transit-data), then run `qri save nyc-transit-data/turnstile_daily_counts_2020 --body tmp/daily_counts_2020.csv --title "update data for week ending April 18, 2020"`
3. Run `qri publish nyc-transit-data/turnstile_daily_counts_2020`
4. `SELECT date, sum(entries) FROM daily_counts_2020 GROUP BY date ORDER BY date ASC` to update the google sheets chart
