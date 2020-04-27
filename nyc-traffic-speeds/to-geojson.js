var TSV = require('tsv');
const fs = require('fs-extra');
const polyline = require('google-polyline');


(async () => {
  try {
    const tsvBuffer = await fs.readFile('./data/LinkSpeedQuery.txt', 'utf8');
    // parse tsv string, remove last item from resulting array
    const observations = TSV.parse(tsvBuffer)
    observations.pop()

    const FC = {
      type: 'FeatureCollection',
      features: observations.map((observation) => {
        const {
          id,
          EncodedPolyLine,
          Owner: owner,
          Borough: borough,
          linkName
        } = observation



        const coordinates = polyline.decode(EncodedPolyLine).map(([lat, lng]) => [lng, lat])

        return {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {
            id,
            owner,
            borough,
            linkName
          }
        }
      })
    }

    fs.writeFile('./data/speeds.geojson', JSON.stringify(FC, null, 4));

  } catch(e) {
    console.log(e)
  }
})()
