const fs = require('fs')
const fetch = require('node-fetch')
const moment = require('moment')

const toISO8601 = (unix) => {
  return moment.unix(unix).format()
}

// from https://stackoverflow.com/questions/46637955/write-a-string-containing-commas-and-double-quotes-to-csv
const sanitizeString = (desc) => {
    var itemDesc;
    if (desc) {
        itemDesc = desc.replace(/(\r\n|\n|\r|\s+|\t|&nbsp;)/gm,' ');
        itemDesc = itemDesc.replace(/,/g, '\,');
        itemDesc = itemDesc.replace(/"/g, '""');
        itemDesc = itemDesc.replace(/'/g, '\'');
        itemDesc = itemDesc.replace(/ +(?= )/g,'');
    } else {
        itemDesc = '';
    }
    return `"${itemDesc}"`;
}

const fetchMetaData = async (datasetId) => {
  const metadataUrl = `https://data.cityofnewyork.us/api/views/${datasetId}.json`
    // get the metadata json
  console.log('getting metadata...', metadataUrl)
  const raw = await fetch(metadataUrl).then(d => d.json())
  const {
    id,
    name,
    attribution,
    averageRating,
    category,
    createdAt,
    description,
    displayType,
    downloadCount,
    hideFromCatalog,
    hideFromDataJson,
    indexUpdatedAt,
    newBackend,
    numberOfComments,
    oid,
    provenance,
    publicationAmmendEnabled,
    publicationDate,
    publicationGroup,
    publicationStage,
    rowClass,
    rowsUpdatedAt,
    rowsUpdatedBy,
    tableId,
    totalTimesRated,
    viewCount,
    viewLastModified,
    viewType,
    metadata,
    tags
  } = raw

  // clean up the metadata

  const { custom_fields } = metadata
  const { Update, 'Dataset Information': datasetInformation } = custom_fields
  const {
    Automation: automation,
    'Date Made Public': dateMadePublic,
    'Update Frequency': updateFrequency
  } = Update

  let agency = ''
  if (datasetInformation && datasetInformation.Agency) {
    agency = datasetInformation.Agency
  }

  const tagsAsString = tags ? tags.join(';') : ''

  return {
    id,
    name: sanitizeString(name),
    attribution: sanitizeString(attribution),
    averageRating,
    category,
    createdAt: toISO8601(createdAt),
    description: sanitizeString(description),
    displayType,
    downloadCount,
    hideFromCatalog,
    hideFromDataJson,
    indexUpdatedAt: toISO8601(indexUpdatedAt),
    newBackend,
    numberOfComments,
    oid,
    provenance,
    publicationAmmendEnabled,
    publicationDate: toISO8601(publicationDate),
    publicationGroup,
    publicationStage,
    rowClass,
    rowsUpdatedAt: toISO8601(rowsUpdatedAt),
    rowsUpdatedBy,
    tableId,
    totalTimesRated,
    viewCount,
    viewLastModified: toISO8601(viewLastModified),
    viewType,
    automation,
    dateMadePublic: sanitizeString(dateMadePublic),
    updateFrequency,
    agency: sanitizeString(agency),
    tags: sanitizeString(tagsAsString)
  }
}

(async () => {
  const { dataset: catalog } = require('./tmp/nyc.json')

  // const subset = catalog.slice(0, 50)
  const subset = catalog

  const ids = subset.map(d => d.landingPage.split('/')[4])

  console.log(ids)

  // const ids = ['v2kq-qrx6']

  const output = fs.createWriteStream('./tmp/output.csv')
  console.log(ids.length)
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    try {
      const metadataRow = await fetchMetaData(id)
      console.log(metadataRow.description)

      // add header on first result
      if (i === 0) output.write(Object.keys(metadataRow).join(','))

      const row = Object.keys(metadataRow).map(d => metadataRow[d]).join(',')
      output.write(`\n${row}`)


    } catch(e) {
      console.log('SCRIPT ERROR', e)
    }

  }
})();
