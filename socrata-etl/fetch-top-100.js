// scrape the top 100 datasets

const fetch = require('node-fetch')
const cheerio = require('cheerio')

const { writer } = require('./io')


const getTop100 = async () => {
  const top100page = 'https://data.cityofnewyork.us/browse?q=&sortBy=most_accessed&limit=100'
  const html = await fetch(top100page).then(d => d.text())
  const $ = cheerio.load(html);

  const results = $('.browse2-result-name-link')

  const datasets = results.map((i, d) => {
    const [,,,,slug,id] = $(d).attr('href').split('/')
    return {
      slug,
      id
    }
  }).get()

  console.log(datasets)

  writer(`data/ids.json`, JSON.stringify(datasets))
}

getTop100()
