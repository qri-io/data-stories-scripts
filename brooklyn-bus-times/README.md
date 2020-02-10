# brooklyn-bus-times

Node.js data logging scripts for real-time bus data (using the NYC MTA's Bus Time API).  

`log.js` can be run with a cron job, and will call the Bus Time API for the specified route and transform the XML response into JSON.  It writes two files in `/data`: `{timestamp}-stops.json` and `{timestamp}-vehicles.json`

To collect json observations for a specific time range, use `collect-stops-json.js` and `collect-vehicles-json.js` to create CSVs in `/data`
