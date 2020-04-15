# nyc-open-data-archive

Scripts for the programmatic creation and update of qri datasets from NYC Open Data Portal (Socrata) datasets.

## How to Use

Given a Socrata 4x4 id, `process-dataset` will do the following:

- Make an API call for the dataset's metadata
- Use the metadata to create a qri `meta` component as json
- Use the title and description to create a qri `readme` component as markdown
- Use the metadata to create a qri `structure` component as json
- Save all of these files and the downloaded CSV in `tmp/{id}`
- Derive a valid qri datasetname from the dataset title
- Run `qri save` with all of the files to either create or update the dataset
- Run `qri publish` on the new/updated dataset

### Scripts that call process-dataset

`datasets-from-ids.js` will iterate over the array of ids in `data/ids.json` and call `process-dataset` for each one that is under a specified row count.

`process-one` takes a dataset id as a parameter and will call `process-dataset` only once for that dataset
