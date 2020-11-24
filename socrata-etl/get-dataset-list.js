// scrape the top 100 datasets

const fetch = require('node-fetch')
const cheerio = require('cheerio')

const { writer } = require('./util/io')

const getDatasetList = async ({ id, domain }) => {
  const datasetListURL = `http://api.us.socrata.com/api/catalog/v1?domains=${domain}&limit=10000`
  console.log(`fetching ${datasetListURL}`)
  const json = await fetch(datasetListURL).then(d => d.json())

  await writer(`data/${id}.json`, JSON.stringify(json))
}

module.exports = getDatasetList
