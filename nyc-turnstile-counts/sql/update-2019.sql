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
