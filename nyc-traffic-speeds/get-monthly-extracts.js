const fetch = require('node-fetch');
const moment = require('moment');

const { writer } = require('./util/io');

// pull down 2020 ytd

// January
// https://data.cityofnewyork.us/resource/i4gi-tjb9.csv?$select=id,speed,travel_time,data_as_of,%20owner,%20borough,%20link_name&$where=data_as_of%20%3E=%20%272020-01-01T00:00:00%27&$limit=1000000


(async () => {

  const months = [
    '2017-05',
    '2017-06',
    '2017-07',
    '2017-08',
    '2017-09',
    '2017-10',
    '2017-11',
    '2017-12',
    '2018-01',
    '2018-02',
    '2018-03',
    '2018-04',
    '2018-05',
    '2018-06',
    '2018-07',
    '2018-08',
    '2018-09',
    '2018-10',
    '2018-11',
    '2018-12',
    '2019-01',
    '2019-02',
    '2019-03',
    '2019-04',
    '2019-05',
    '2019-06',
    '2019-07',
    '2019-08',
    '2019-09',
    '2019-10',
    '2019-11',
    '2019-12',
    '2020-01',
    '2020-02',
    '2020-03',
    '2020-04',
    '2020-05'
  ]

  // download the monthly csvs
  for (let i = 0; i < months.length; i++) {
    const currentMonth = months[i]
    const nextMonth = months[i + 1]
    console.log(currentMonth, nextMonth)

    if (nextMonth) {
      try {
        const apiCall = `https://data.cityofnewyork.us/resource/i4gi-tjb9.csv?$select=id,speed,travel_time,data_as_of,%20owner,%20borough,%20link_name&$where=data_as_of%20between%20%27${currentMonth}-01T00:00:00%27%20and%20%27${nextMonth}-01T00:00:00%27&$limit=10000000`
        const bodyBuffer = await fetch(apiCall).then(d => d.arrayBuffer())

        await writer(`tmp/${currentMonth}/body.csv`, bodyBuffer, 'buffer')

      } catch(e) {
        console.log('SCRIPT ERROR', e)
      }
    }
  }

  // create a readme for each
  for (let i = 0; i < months.length; i++) {
    const currentMonth = months[i]

    try {
      const displayMonth = moment(`${currentMonth}-01`).format('MMMM YYYY')
      const readme = `# NYC DOT Traffic Speeds - ${displayMonth}

This qri dataset is a monthly extract of the much larger \`DOT Traffic Speeds NBE\` dataset [hosted on the NYC Open Data Portal](https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds-NBE/i4gi-tjb9).

This data feed contains 'real‐time' traffic information from locations where NYCDOT has installed sensors, mostly on major arterials and highways within the City limits. NYCDOT uses this information for emergency response and management.

## Spatial Data

The original dataset included linestring geometries for each row's associated highway segment.  This was duplicitave and dramatically increased the size of the dataset.  The geometries were omitted from these extracts to keep the file size smaller.

To map the data, you can join it with the linestrings in [nyc-traffic-speeds/nyc-traffic-speeds-geometries](https://qri.cloud/nyc-transit-data/nyc-traffic-speeds-geometries) using the \`id\` field.

## ETL Details

The dataset was created by querying the NYC Open Data Portal API for a single month's data at a time dating back to May 2017, then adding this common \`readme\` along with common \`meta\` and \`structure\`.  The code for this ETL is located at [https://github.com/qri-io/data-stories-scripts/tree/master/nyc-traffic-speeds](https://github.com/qri-io/data-stories-scripts/tree/master/nyc-traffic-speeds)

The \`status\`, \`link_id\`, and \`transcom_id\` fields were also omitted, as the [official metadata PDF](file:///Users/chriswhong/Downloads/metadata_trafficspeeds%20(1).pdf) indicates that they are either duplicates or non-useful artifacts.
`

      await writer(`tmp/${currentMonth}/readme.md`, readme)

    } catch(e) {
      console.log('SCRIPT ERROR', e)
    }

  }

  // create a meta for each
  for (let i = 0; i < months.length; i++) {
    const currentMonth = months[i]
    const nextMonth = months[i + 1]

    const apiCall = `https://data.cityofnewyork.us/resource/i4gi-tjb9.csv?$select=id,speed,travel_time,data_as_of,%20owner,%20borough,%20link_name&$where=data_as_of%20between%20%27${currentMonth}-01T00:00:00%27%20and%20%27${nextMonth}-01T00:00:00%27&$limit=10000000`

    try {
      const displayMonth = moment(`${currentMonth}-01`).format('MMMM YYYY')
      const readme = `# NYC DOT Traffic Speeds - ${displayMonth}`

      const meta = {
        "qri": "md:0",
        "title": `NYC DOT Traffic Speeds - ${displayMonth}`,
        "theme": [
          "Transportation"
        ],
        "keywords": [
          'highways',
          'nyc',
          'nyc open data',
          'highway speeds'
        ],
        "description": "This qri dataset is a monthly extract of the much larger \`DOT Traffic Speeds NBE\` dataset hosted on the NYC Open Data Portal (https://data.cityofnewyork.us/Transportation/DOT-Traffic-Speeds-NBE/i4gi-tjb9). This data feed contains 'real‐time' traffic information from locations where NYCDOT has installed sensors, mostly on major arterials and highways within the City limits. NYCDOT uses this information for emergency response and management.",

        "accessUrl": apiCall
      }

      await writer(`tmp/${currentMonth}/meta.json`, meta)

    } catch(e) {
      console.log('SCRIPT ERROR', e)
    }

  }

  // create a structure for each
  for (let i = 0; i < months.length; i++) {
    const currentMonth = months[i]

    try {

      const structure = {
        "depth": 2,
        "format": "csv",
        "formatConfig": {
          "headerRow": true,
          "lazyQuotes": true
        },
        "qri": "st:0",
        "schema": {
          "items": {
            "items": [
              {
                "description": "TRANSCOM Link ID",
                "title": "id",
                "type": "string"
              },
              {
                "description": "Average speed a vehicle traveled between end points on the link in the most recent interval",
                "title": "speed",
                "type": "string"
              },
              {
                "description": "Time the average vehicle took to traverse the link",
                "title": "travel_time",
                "type": "string"
              },
              {
                "description": "Last time data was received from link",
                "title": "data_as_of",
                "type": "string"
              },
              {
                "description": "Owner of the Detector",
                "title": "owner",
                "type": "string"
              },
              {
                "description": "NYC borough (Brooklyn, Bronx, Manhattan, Queens, Staten Island)",
                "title": "borough",
                "type": "string"
              },
              {
                "description": "Description of the link location and end points",
                "title": "link_name",
                "type": "string"
              }
            ],
            "type": "array"
          },
          "type": "array"
        }
      }

      await writer(`tmp/${currentMonth}/structure.json`, structure)

    } catch(e) {
      console.log('SCRIPT ERROR', e)
    }

  }
})();
