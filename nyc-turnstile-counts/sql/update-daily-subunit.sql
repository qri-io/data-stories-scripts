DROP TABLE IF EXISTS daily_subunit;
CREATE TABLE daily_subunit AS (
  SELECT
    unit_id,
    (array_agg(remoteunit))[1] AS remoteunit,
    date_trunc('day', observed_at - interval '2h')::date AS date,
    SUM(net_entries) AS entries,
    SUM(net_exits) AS exits
  FROM turnstile_observations
  GROUP BY unit_id, date_trunc('day', observed_at - interval '2h')
);
