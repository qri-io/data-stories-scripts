const meta = (sourceMetadata, datasetId) => {
  const {
    id: identifier,
    name: title,
    attribution,
    category: theme,
    createdAt,
    description,
    downloadCount,
    rowsUpdatedAt,
    tags: keywords,
    metadata
  } = sourceMetadata
  // maps sourceMetadata fields to qri metadata keys

  return {
    qri: 'md:0',
    identifier,
    title,
    theme: [ theme ],
    keywords,
    description,
    contributors: [
      {
        id: undefined,
        name: attribution,
        email: undefined
      }
    ],
    accessUrl: `https://data.cityofchicago.org/api/views/${datasetId}/rows.csv?accessType=DOWNLOAD
`,
    createdAt,
    downloadCount,
    rowsUpdatedAt,
    // accrualPeriodicity: metadata.custom_fields.Update['Update Frequency'].trim(),
    // agency: metadata.custom_fields['Dataset Information']['Agency']
  }
}

const readme = (metadata) => {
  const { id, name, description } = metadata
  return `# ${name}
${description}

## Import Details

This qri dataset was programmatically created from a dataset published on the Chicago Open Data Portal.  [Original Dataset on data.cityofchicago.org/](https://data.cityofchicago.org/d/d/${id})

The latest update ran on ${Date(Date.now()).toString()}`
}

const structure = (metadata) => {
  const { columns } = metadata

  const items = columns.map((column) => {
    const {
      description,
      fieldName: title,
      dataTypeName
    } = column

    let type = 'string'

    // everything is a string except these
    if (dataTypeName === 'number') type = 'number'

    return {
      description,
      title,
      type
    }
  })

  return {
    depth: 2,
    format: 'csv',
    formatConfig: {
      headerRow: true,
      lazyQuotes: true
    },
    qri: 'st:0',
    schema: {
      items: {
        items,
        type: 'array'
      },
      type: 'array'
    }
  }
}


module.exports = {
  meta,
  readme,
  structure
}
