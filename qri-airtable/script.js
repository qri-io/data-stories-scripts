var Airtable = require('airtable')
var parallel = require('run-parallel')
var deepEqual = require('deep-equal')
const ObjectsToCsv = require('objects-to-csv')
var debug = require('debug')('airtable-github-export')
const fs = require('fs')
const qri = require('./node-qri')


const TEMP_DIR = '/tmp'

require('dotenv').config()

var config = {
  table: process.env.TABLE,
  base: process.env.AIRTABLE_BASE_ID
}

console.log(config)

const base = require('airtable').base(config.base)
var output = {}


const fetchTable = async() => {
  return new Promise(async (resolve) => {
    const base = require('airtable').base(config.base)

    const data = []

    console.log(`fetching data for table '${config.table}'`)
    base(config.table).select({
      sort: [{
        field: 'Date'
      }]
    }).eachPage(page, done)

    function page (records, next) {
      records.forEach(function (record) {
        data.push(record.fields)
      })
      next()
    }

    function done (err) {
      if (!err) {
        console.log('done!')
        resolve(data)
      }

      reject(err)
    }
  })
}

const writeToCSV = async (data) => {
  // generate a "default object" with all the keys
  // necessary to make sure each row has all the same keys
  const defaultObj = data.reduce((m, o) => (Object.keys(o).forEach(key => m[key] = undefined), m), {})
  const withAllKeys = data.map(d => Object.assign({}, defaultObj, d))

  // save a CSV in the tmp directory
  const csv = new ObjectsToCsv(withAllKeys)
  if (!fs.existsSync(`${__dirname}${TEMP_DIR}`)){
    fs.mkdirSync(`${__dirname}${TEMP_DIR}`);
  }
  const bodyFilename = 'body.csv'
  const csvPath = `${__dirname}${TEMP_DIR}/${bodyFilename}`
  console.log(`writing CSV to ${csvPath}`)
  await csv.toDisk(csvPath)

  return csvPath
}

async function main() {
    // get dataset as array of objects from airtable API
    const data = await fetchTable()
    console.log(data)

    const csvPath = await writeToCSV(data)

    await qri.save('me/reef-tank-water-testing', {
      body: csvPath
    })

    // qri push
    await qri.publish('me/reef-tank-water-testing')
}

main()
