# qri-airtable

A simple ETL script that pulls a data from an Airtable using the Airtable API, saves it as a CSV, commits the CSV to a new version of a qri dataset, and publishes the dataset to qri.cloud.

## Environment Variables

The following environment variables are needed, or you can define them in a `.env` file in this directory

```
AIRTABLE_API_KEY=yourapikey
AIRTABLE_BASE_ID=yourbaseid
TABLE=yourhumanfriendlytablename
```
## How to Use

Set the environment variables shown above, modify `script.js` to include the qri dataset name you want to commit to.

Install dependencies - `yarn`

Run `node script.js`
