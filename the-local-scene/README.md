# the-local-scene

Scripts related to "the local scene", a project to scrape, group, and geocode band camp profiles.

## /map

Contains initial work by @xristosk to map the results.  [See data story post for the final map](https://qri.io/data-stories/the-local-scene).

## /make-geojson

A node.js script that imports `bandcamp_artists.csv` and exports `ny-artists.geojson` to power the data story web map.  To use, install dependencies `npm install` and run the script `node make-geojson.js`
