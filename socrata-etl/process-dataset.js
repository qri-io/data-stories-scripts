const fetch = require('node-fetch')
const slugify = require('slugify')
const { writer } = require('./util/io')
const qri = require('./util/qri')
const buildComponent = require('./util/build-component')

// helper function to fetch socrata metadata
const fetchMetaData = (datasetId) => {
  const metadataUrl = `https://data.cityofchicago.org/api/views/${datasetId}.json`
    // get the metadata json
  console.log('getting metadata...', metadataUrl)
  return fetch(metadataUrl).then(d => d.json())
}

// given a socrata 4x4, pull down data,
// transform into qri component files,
// save, and publish
const processDataset = async (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await fetchMetaData(id)
      const qriMeta = buildComponent.meta(metadata, id)

      const structure = buildComponent.structure(metadata)

      const readme = buildComponent.readme(metadata)

      const bodyBuffer = await fetch(`https://data.cityofchicago.org/api/views/${id}/rows.csv?accessType=DOWNLOAD`).then(d => d.arrayBuffer())


      await writer(`tmp/${id}/readme.md`, readme)
      await writer(`tmp/${id}/structure.json`, structure)
      await writer(`tmp/${id}/meta.json`, qriMeta)
      await writer(`tmp/${id}/body.csv`, bodyBuffer, 'buffer')

      const datasetName = slugify(qriMeta.title, {
        replacement: '-',
        lower: true,
        strict: true
      })

      console.log(`saving me/${datasetName}...`)
      await qri.save(datasetName, `tmp/${id}`)

      console.log(`publishing me/${datasetName}...`)
      await qri.publish(datasetName)

      setTimeout(() => {
        resolve()
      }, 1000)
    } catch(e) {
      console.log(e)
      reject(e)
    }
  })
}

module.exports = processDataset
