# us-census-extracts

Scripts for creating qri datasets for American Community Survey Subject Tables

## How to Use

- Clone this repo
- Install dependencies `npm install`

Use `node states-subject-tables` to hit the census api for each table in `subject-tables.json`.  It will create a new folder `tmp/{datasetname}` with `body.csv`, `meta.json`, `structure.json`, and `readme.md`.  

It currently runs both the 2018 1-year estimates and 2018 5-year estimates, and generates a table where each row is a U.S. state.

With some slight modification we can also generate counties for each state, or any other cut of the data there is demand for.

Make sure you are using the correct qri username, then run `node save-and-publish` to create a new dataset from each folder in `/tmp` and publish it to qri.cloud
