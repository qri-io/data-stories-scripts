# NYC Open Data Catalog

Scripts to generate a table of metadata for all datasets on the NYC Open Data Portal.

## Background

The simple question to answer is "What the most viewed/downloaded" datasets published on the NYC Open Data Portal.  It's possible to sort the catalog website by most viewed, but the download count is elusive.  It's available on each dataset's landing page, but there's no quick way to see them all at once.  This script gathers the download count (and other platform metadata) for each dataset and compiles them into a qri dataset.

## Approach

Use `data.json` as the list of all datasets.  `data.json` is a catalog feed, and contains an abbreviated set of metadata for all of the datasets.  We are ignoring just about all of it, and are only interested in the dataset ids which we can use to get each dataset's detailed metadata.

`curl https://data.cityofnewyork.us/data.json > ./tmp/nyc.json`

Now that we know all of the dataset ids, we can call the metadata API for each one:

`https://data.cityofnewyork.us/api/views/:id.json`

The following fields will be added to our new dataset:

```
id
name
attribution
averageRating
category
createdAt
description
displayType
downloadCount
hideFromCatalog
hideFromDataJson
indexUpdatedAt
newBackend
numberOfComments
oid
provenance
publicationAmmendEnabled
publicationDate
publicationGroup
publicationStage
rowClass
rowsUpdatedAt
rowsUpdatedBy
tableId
totalTimesRated
viewCount
viewLastModified
viewType
automated
dataMadePublic
updateFrequency
agency
tags
```

## Scripts

`process-datasets.js` iterates over the datasets in `data.json`, calls the metadata API, processes the response, and writes a new line to the CSV at `tmp/output.csv`

It takes only a few minutes to fetch metadata for the 2,712 datasets listed in `data.json`

`create-and-publish.js` creates a new qri dataset in the local qri store, and publishes it.  
