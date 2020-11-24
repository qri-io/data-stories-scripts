const camelCase = require('camelcase')

const appendCustomFields = (qriMeta, metadata, customFieldsKeys) => {
  customFieldsKeys.forEach((customFieldsKey) => {
    Object.keys(metadata.custom_fields[customFieldsKey]).forEach((field) => {
      console.log(field)
      const casedName = camelCase(field)

      qriMeta[casedName] = metadata.custom_fields[customFieldsKey][field]
    })
  })

  return qriMeta
}

const meta = (sourceMetadata, domainConfig) => {
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

  let qriMeta = {
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
    accessUrl: `https://${domainConfig.domain}/api/views/${identifier}/rows.csv?accessType=DOWNLOAD`,
    createdAt,
    downloadCount,
    rowsUpdatedAt
  }

  // special handling for domain-specific custom metadata
  if (domainConfig.domain === 'data.cityofnewyork.us') {
    qriMeta.accrualPeriodicity = metadata.custom_fields.Update['Update Frequency'].trim(),
    qriMeta.agency = metadata.custom_fields['Dataset Information']['Agency'].trim()
  }

  if (domainConfig.domain === 'data.ny.gov') {
    const customFieldsKeys = ['Dataset Summary', 'Common Core', 'Additional Resources', 'Notes', 'Dataset Information']
    qriMeta = appendCustomFields(qriMeta, metadata, customFieldsKeys)
  }

  return qriMeta
}

const readme = (metadata, domainConfig) => {
  const { id, name, description } = metadata
  return `# ${domainConfig.displayName} Open Dataset - ${name}
${description}

## Import Details

This qri dataset was programmatically created from a dataset published on the ${domainConfig.displayName} Open Data Portal.  [Original Dataset](https://${domainConfig.domain}/d/d/${id})

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
