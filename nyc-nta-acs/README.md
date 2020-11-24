

## file geodatabase to csvs

This will extract the various layers from the file geodatabase, saving a CSV and a CSVT (column type definition) for each.  The column descriptions are also extracted.

`ogr2ogr -f "CSV" ./csv ./tmp/NTA_ACS_2014_2018.gdb/ -lco GEOMETRY=AS_WKT -s_srs EPSG:2263 -t_srs EPSG:4326 -overwrite -lco CREATE_CSVT=true GEOMETRY_NAME=geometry`

## Create Qri Datasets from data, types, and metadata

`node csv2qri.js`

## Save qri datasets

In each subject directory, run `qri save me/{datasetname} --body body.csv --file meta.json --file readme.md --file structure.json`
