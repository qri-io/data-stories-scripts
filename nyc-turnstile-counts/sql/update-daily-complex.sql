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
