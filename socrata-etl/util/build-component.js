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

const meta = (sourceMetadata, domain) => {
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
    accessUrl: `https://${domain}/api/views/${identifier}/rows.csv?accessType=DOWNLOAD`,
    createdAt,
    downloadCount,
    rowsUpdatedAt
  }

  // special handling for domain-specific custom metadata
  if (domain === 'data.cityofnewyork.us') {
    qriMeta.accrualPeriodicity = metadata.custom_fields.Update['Update Frequency'].trim(),
    qriMeta.agency = metadata.custom_fields['Dataset Information']['Agency'].trim()
  }

  if (domain === 'data.ny.gov') {
    const customFieldsKeys = ['Dataset Summary', 'Common Core', 'Additional Resources', 'Notes', 'Dataset Information']
    qriMeta = appendCustomFields(qriMeta, metadata, customFieldsKeys)
  }

  return qriMeta
}

const readme = (metadata, domain) => {
  const { id, name, description } = metadata
  return `# ${name}
${description}

## Import Details

This qri dataset was programmatically created from a dataset published on a Socrata Open Data Portal.  [Original Dataset](https://${domain}/d/d/${id})

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
