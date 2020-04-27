# nyc-traffic-speeds

Scripts for automating the creation and update of the monthly [NYC traffic speeds datasets](https://qri.cloud/nyc-traffic-speeds/) and associated spatial data

## Scripts

`get-monthly-extracts.js` - iterates over a hard-coded list of month strings and queries the source dataset for that month's data, storing it in `/tmp/{YYYY-MM}`.  Also creates a `readme.md`, `structure.json`, and `meta.json` for use in creating a qri dataset.

`save-and-publish` - iterates over each directory in `/tmp`, creating a qri dataset for each from the `body`, `meta`, `structure`, and `readme` files.  Publishes the new dataset to qri cloud.

`to-geojson.js` - Transforms the raw data from `data/LinkSpeedQuery.txt` into a geojson FeatureCollection by decoding the linestring in `ENCODED_POLY_LINE`.  This geojson was converted to CSV with WKT geometry to create the geometry lookup table `nyc-traffic-speeds/nyc-traffic-speeds-geometries`

## Jupyter Notebook

`traffic-speeds.ipynb` is a jupyter notebook with some simple exploratory analysis and charts using some of the new monthly datasets.
