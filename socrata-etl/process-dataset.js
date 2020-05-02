const fetch = require('node-fetch')
const slugify = require('slugify')
const { writer } = require('./util/io')
const buildComponent = require('./util/build-component')
const qri = require('../../../qri/node-qri')

// helper function to fetch socrata metadata
const fetchMetaData = (domain, id) => {
  const metadataUrl = `https://${domain}/api/views/${id}.json`
    // get the metadata json
  console.log('fetching metadata...', metadataUrl)
  return fetch(metadataUrl).then(d => d.json())
}

// given a domain and socrata 4x4, pull down data,
// transform into qri component files,
// save, and publish
const processDataset = async (domain, id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await fetchMetaData(domain, id)
      const qriMeta = buildComponent.meta(metadata, domain)
      console.log('Created Qri Meta', qriMeta)

      const structure = buildComponent.structure(metadata)
      console.log('Created Qri Structure', structure)

      const readme = buildComponent.readme(metadata, domain)
      console.log('Created Qri Readme', readme)

      const bodyUrl = `https://${domain}/api/views/${id}/rows.csv?accessType=DOWNLOAD`
      console.log('Downloading CSV', bodyUrl)
      const bodyBuffer = await fetch(bodyUrl).then(d => d.arrayBuffer())

      console.log(`Writing component files to /tmp/${id}`)
      await writer(`tmp/${id}/readme.md`, readme)
      await writer(`tmp/${id}/structure.json`, structure)
      await writer(`tmp/${id}/meta.json`, qriMeta)
      await writer(`tmp/${id}/body.csv`, bodyBuffer, 'buffer')

      const datasetName = slugify(qriMeta.title, {
        replacement: '-',
        lower: true,
        strict: true
      })

      if (process.argv.includes('--save')) {
        console.log(`saving me/${datasetName}...`)
        await qri.save(`me/${datasetName}`, {
          body: `${__dirname}/tmp/${id}/body.csv`,
          file: [
            `${__dirname}/tmp/${id}/meta.json`,
            `${__dirname}/tmp/${id}/readme.md`,
            `${__dirname}/tmp/${id}/structure.json`
          ]
        })
      }

      if (process.argv.includes('--publish')) {
        console.log(`publishing me/${datasetName}...`)
        await qri.publish(`me/${datasetName}`)
      }


      setTimeout(() => {
        resolve()
      }, 1000)
    } catch(e) {
      console.log(e)
      reject(e)
    }
  })
}

const datasetURL = process.argv[2]

if (datasetURL) {
  const [,,domain,,,id] = process.argv[2].split('/')
  processDataset(domain, id)
}

module.exports = processDataset
