
# Getting the Raw Data

There is jQuery on the page, so we can do this from the console easily, then clean up in a text editor.  This command gets all of the download URLs.

```
var aTags = $('.span-84').find('a')
aTags.each(function (tag) { console.log($(this).attr('href'))})
```

These are trimmed down to the list in `weekly-timestamps.json`

Use `download-csv.sh` to get each CSV file and save it to `/source-csv`


# Populate the Database

Use `create.sql` to create table `turnstilesraw`

Use `import.sh` to import CSVs

## Combine date and time columns into a proper postgres date/time

`ALTER TABLE turnstilesraw ADD COLUMN timestamp timestamp`

`UPDATE turnstilesraw SET timestamp = TO_TIMESTAMP(EXTRACT(EPOCH FROM (date::date + time::time)))`

## Each observation is for a combination of controlarea + remoteunit + subunit_channel_position, so let's concatenate these to make a new column that we can index for faster searching

`ALTER TABLE turnstilesraw ADD COLUMN combined_id varchar`

`UPDATE turnstilesraw SET combined_id = CONCAT(controlarea, remoteunit, subunit_channel_position)`

## add index to timestampsraw

`CREATE UNIQUE INDEX idx_turnstilesraw_unique
ON turnstilesraw(control_area, remote_unit, scp, timestamp);`  

## New table sorted by timestamp descending and combined_id ascending

`CREATE table timestamp_sorted AS (SELECT * FROM turnstilesraw ORDER BY timestamp DESC, combined_id ASC)`

`CREATE INDEX idx_timestamp_sorted_combined_id
ON timestamp_sorted(combined_id);`

`CREATE INDEX idx_timestamp_sorted_timestamp
ON timestamp_sorted(timestamp);`



## New table with calculated counts for each time and its prior time

Check out `https://github.com/toddwschneider/nyc-subway-turnstile-data/blob/3c011886038348a456ba8799ff7d6302f4b896bd/app/models/turnstile_observation.rb#L60-L76` for another approach to doing this that uses `LAG()`

```
CREATE table counts AS (
  SELECT
    	a.controlarea,
    	a.remoteunit,
    	a.subunit_channel_position,
    	a.station,
    	a.linename,
    	a.division,
    	lookup.timestamp as begin_timestamp,
    	a.timestamp as end_timestamp,
    	a.entries - lookup.entries AS entries_diff,
    	a.exits - lookup.exits AS exits_diff
    FROM timestamp_sorted a
    LEFT JOIN LATERAL (
  	  SELECT * FROM (
    		SELECT *
    		FROM timestamp_sorted
    		WHERE combined_id = a.combined_id
  		AND timestamp < a.timestamp
    	) combined_id_observations
    	LIMIT 1
    ) lookup
    ON TRUE
)
```

## Add indices to make grouping faster

`ALTER TABLE counts ADD COLUMN combined_id varchar`

`UPDATE counts SET combined_id = CONCAT(controlarea, remoteunit, subunit_channel_position)`

`CREATE INDEX idx_counts_combined_id
ON counts(combined_id);`

`CREATE INDEX idx_counts_end_timestamp
ON counts(end_timestamp);`

## Now aggregate to station for time range and sum entries and exits

First query: group by date using end_timestamp and combined_id.  This gets us a daily count for each individual turnstile

**Do not include units whose with counts over 10k (this is a manually-defined cutoff to exclude bad data due to counter rollovers)**

```
DROP TABLE IF EXISTS daily_subunit;
CREATE TABLE daily_subunit AS (
  SELECT a.*, b.remoteunit FROM (
    SELECT
      combined_id,
      date_trunc('day', end_timestamp)::date AS date,
      SUM(ABS(entries_diff)) AS entries,
      SUM(ABS(exits_diff)) AS exits
    FROM counts
    WHERE ABS(entries_diff) < 10000
    AND ABS(exits_diff) < 10000
    GROUP BY combined_id, date_trunc('day', end_timestamp)
  ) a
  JOIN (
    SELECT DISTINCT ON (combined_id) * from turnstilesraw
  ) b
  ON a.combined_id = b.combined_id
);
```

Only took a minute! 2213729 rows

Join with remoteunit, can't use substring because the combined_ids are different lengths

Subquery joins with our lookup table that links remoteunit to subway complex

```
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


Now join with stop Name

```
SELECT b."stop name", a.*
FROM daily_complex a
LEFT JOIN (
 SELECT DISTINCT ON ("stop name") * FROM  stations
) b
ON a.complex_id = b."complex id"
```

Daily Counts for Atlantic Ave Barclays Center
```
SELECT * FROM daily_remoteunit WHERE remoteunit = 'R057'
```

http://web.mta.info/developers/data/nyct/subway/Stations.csv
Appears to be the authoritative list of stations.  Need to map the remoteunits to these

It's "complexes" we need, not stations.  Need to map remote units to complexes


```
CREATE TABLE daily_complex_with_name AS (
  SELECT
    b."stop name" as stop_name,
    b."daytime routes" as daytime_routes,
    a.*
	FROM daily_complex a
	LEFT JOIN (
	 SELECT DISTINCT ON ("complex id") "complex id"::text, "stop name", "daytime routes" FROM stations
   UNION ALL
   VALUES
    ('R468', 'Roosevelt Island Tram - Eastbound', ''),
    ('R469', 'Roosevelt Island Tram - Westbound', ''),
    ('R540', 'PATH WTC', ''),
    ('R541', 'PATH 33 St', ''),
    ('R542', 'PATH 23 St', ''),
    ('R543', 'PATH Exchange Place', ''),
    ('R544', 'PATH Harrison', ''),
    ('R545', 'PATH 14 St', ''),
    ('R546', 'PATH Pavonia/Newport', ''),
    ('R547', 'PATH 9th St', ''),
    ('R548', 'PATH Chrisotpher St', ''),
    ('R549', 'PATH Newark', ''),
    ('R550', 'PATH City/Bus', ''),
    ('R551', 'PATH Grove Street', ''),
    ('R552', 'PATH Journal Square', '')
	) b
	ON a.complex_id = b."complex id"
)
```
