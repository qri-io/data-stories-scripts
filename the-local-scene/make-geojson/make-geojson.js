const csv = require('csv-parser');
const fs = require('fs');

// helper function to clean up the genres list from the source CSV
const cleanGenres =  (rawGenres) => {
  let [,genres] = rawGenres.match(/\(([^\)]+)\)/)
  genres = genres.split(',').map((d) => {
    const match = d.match(/'([^\)]+)'/)
    return match ? match[1] : d
  })
  // remove the last value, it looks like the city
  genres.pop()
  return genres
}

// empty array to hold our ny artists
const nyArtists = []

// kick things off by reading the CSV
fs.createReadStream('bandcamp_artists.csv')
  .pipe(csv())
  .on('data', (row) => {
    // grab the new york artists
    if (row.state == 'new york' && row.city) {
      nyArtists.push(row)
    }
  })
  .on('end', () => {
    console.log('CSV file successfully processed');

    // group by location, make a key for each city, set it to an array of the artists for that city
    const byLocation = {}

    nyArtists.forEach((artistRecord) => {
      if (byLocation[artistRecord.city]) {
        byLocation[artistRecord.city].push(artistRecord)
      } else {
        byLocation[artistRecord.city] = [artistRecord]
      }
    })

    // set up our featureCollection
    const FC = {
      type: 'FeatureCollection',
      // map each city key into a feature
      features: Object.keys(byLocation).map((location) => {
        const locationArtists = byLocation[location]

        // count artists in each unique genre
        const genreCount = locationArtists.reduce(function(acc, curr) {
          // clean up string that looks like "('foo', 'bar', 'baz', ...)"

          const { root_genre } = curr
          const foundItem = acc.find(d => d.id == root_genre)
          if(foundItem  === undefined ) {
            acc.push({
              id: root_genre,
              count: 1
            });
          } else {
            foundItem.count += 1
          }
          return acc;

        }, [])

        // sort by count
        genreCount.sort((a, b) => b.count - a.count)

        let coordinates = [
          parseFloat(locationArtists[0].longitude),
          parseFloat(locationArtists[0].latitude)
        ]

        // shim in some corrections for poor geocodes (sweden, russia, stockhol, and greece)
        if (location === 'sweden') coordinates = [-77.9510, 43.1727]
        if (location === 'greece') coordinates = [-77.6931, 43.2098]
        if (location === 'russia') coordinates = [-75.0845, 43.2859]
        if (location === 'stockholm') coordinates = [-74.8398, 44.7564]


        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
          properties: {
            location,
            genreCount,
            artistCount: locationArtists.length,
            artists: locationArtists.map((artist) => {
              const { artist_name: name, bc_url, genres } = artist
              return {
                name,
                bc_url,
                genres: cleanGenres(genres)
              }
            })
          }
        }

      })
    }

    // write the geojson
    fs.writeFileSync('ny-artists.geojson', JSON.stringify(FC));
  });
