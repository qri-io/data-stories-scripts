const fs = require('fs-extra')
const domains = require('./domains.json')
const getDatasetList = require('./get-dataset-list')
const datasetsFromIds = require('./datasets-from-ids')

const passedDomain = process.argv[2]
const domainConfig = domains.find(d => d.id === passedDomain)

const main = async () => {
  if (!domainConfig) {
    console.error(`Domain ${passedDomain} not found`)
  } else {
    if (!fs.existsSync(`./data/${domainConfig.id}.json`)) {
      // get a list of datasets to import, save it in data/:domain.id.json
      await getDatasetList(domainConfig)
    }

    // process them!
    await datasetsFromIds(domainConfig)
  }
}

main()
