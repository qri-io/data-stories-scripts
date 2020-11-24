const fetch = require('node-fetch')
const processDataset = require('./process-dataset')

// helper function to fetch a dataset's row count
const getRowCount = async ({ domain }, id) => {
  console.log(`https://${domain}/api/id/${id}.json?$select=count(*)%20as%20count`)
  const res = await fetch(`https://${domain}/api/id/${id}.json?$select=count(*)%20as%20count`)
    .then(d => d.json())

  const [{ count }] = res
  return count
}

// iterate over the ids in ids.json, fetch row count
// process datasets that are not too big

const datasetsFromIds = async (domainConfig) => {
  const idListPath = `./data/${domainConfig.id}.json`

  let { results: datasets } = require(idListPath)

  for (let dataset of datasets) {

    console.log(JSON.stringify(dataset, null, 2))
    const { resource, link } = dataset
    const { id } = resource
    const slug = link.split('/')[4].toLowerCase()
    console.log(id, slug)
    try {
      const count = await getRowCount(domainConfig, id)
      if (count < 1000000) {
        console.log(`${slug} has ${count} rows, processing...`)
        await processDataset(domainConfig, id)
      } else {
        console.log(`${slug} has ${count} rows, skipping...`)
      }
    } catch(e) {
      console.log(`${slug} is not tabular, skipping...`, e)
    }
  }
}

module.exports = datasetsFromIds
