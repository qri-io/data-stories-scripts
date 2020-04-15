const fetch = require('node-fetch')
const processDataset = require('./process-dataset')

// helper function to fetch a dataset's row count
const getRowCount = async (id) => {
  const res = await fetch(`https://data.cityofchicago.org/api/id/${id}.json?$select=count(*)%20as%20count`)
    .then(d => d.json())

  const [{ count }] = res
  return count
}

// iterate over the ids in ids.json, fetch row count
// process datasets that are not too big

(async () => {
  const idListPath = process.argv[2]
  let datasets = require(idListPath)
  // to only do a few during development
  // datasets = datasets.slice(0,2)

  for (let i = 0; i < datasets.length; i++) {
    const { id, slug } = datasets[i]
    try {
      const count = await getRowCount(id)
      if (count < 1000000) {
        console.log(`${slug} has ${count} rows, processing...`)
        await processDataset(id)
      } else {
        console.log(`${slug} has ${count} rows, skipping...`)
      }
    } catch(e) {
      console.log(`${slug} is not tabular, skipping...`)
    }

  }
})();
