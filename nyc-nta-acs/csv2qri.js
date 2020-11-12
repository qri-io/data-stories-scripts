// Create qri datasets from csv, csvt (column types), and metadata

const fs = require('fs-extra')
const csv = require('csvtojson')
const firstline = require('firstline')

const subjects = [
  'Demographics',
  'Economics',
  'Housing',
  'Social'
]

const lookupType = (type) => {

  if (type === 'WKT') {
    return 'string'
  } else if (type.includes('String')) {
    return 'string'
  } else if (type.includes('Integer')) {
    return 'integer'
  } else if (type.includes('Real')) {
    return 'number'
  } else {
    throw new Error(`type '${type}' not found`)
  }
}

const getModifierText = (modifierCode) => {
  switch(modifierCode) {
    case 'C':
      return 'Coefficient of Variation'
      break
    case 'E':
      return 'Estimate'
      break
    case 'M':
      return 'Margin of Error'
      break
    case 'P':
      return 'Percent'
      break
    case 'Z':
      return 'Percent Margin of Error'
      break
    default:
      return ''
  }
}

const lookupDescription = (columnName, fields) => {
  console.log(columnName)
  const baseColumnName = columnName.slice(0, -1)
  const match = fields.find(d => d.variablename === baseColumnName)

  if (!match) {
    return null
  } else {
    const baseDescription = match.title
    const modifierCode = columnName.substr(-1)
    const modifierText = getModifierText(modifierCode)
    return `${baseDescription} - ${modifierText}`
  }
}


const createStructure = async (subject, fields) => {
  // open the subject csvt
  const csvFilePath = `./csv/NTA_ACS_${subject}.csv`
  const columnNamesString = await firstline(csvFilePath)
  const columnNamesArray = columnNamesString.split(',')
  const typesString = fs.readFileSync(`${csvFilePath}t`, 'utf-8')
  const typesArray = typesString.split(',')

  const schemaObjects = columnNamesArray.map((title, i) => {
    return {
      title,
      type: lookupType(typesArray[i]),
      description: lookupDescription(title, fields)
    }
  })

  console.log(schemaObjects)

  return {
    "format": "csv",
    "formatConfig": {
    "headerRow": true,
    "lazyQuotes": true
    },
    "qri": "st:0",
    "schema": {
      "items": {
       "items": schemaObjects,
       "type": "array"
     },
     "type": "array"
    }
  }
}

const createMeta = (subject) => {
  return {
    title: `NYC American Community Survey (ACS) by Neighborhood Tabulation Area (NTA) - ${subject} Indicators`,
    description: `American Community Survey (ACS) by Neighborhood Tabulation Area (NTA), 2014-2018. The American Community Survey (ACS) is the most extensive nationwide survey currently available. From its annual releases, we are able to examine the city’s detailed demographic, socioeconomic, and housing characteristics. This is an extract of the ${subject} indicators as a standalone table, extracted from the file geodatabase published by the New York City Department of City Planning at https://www1.nyc.gov/site/planning/data-maps/open-data/dwn-acs-nta.page`,
    keywords: ['NYC', 'ACS', 'American Community Survey', 'Census', 'Census Data', 'Open Data']
  }
}

const createReadme = (subject) => {
  return `# NYC American Community Survey (ACS) by Neighborhood Tabulation Area (NTA) - ${subject} Indicators

American Community Survey (ACS) by Neighborhood Tabulation Area (NTA), 2014-2018. The American Community Survey (ACS) is the most extensive nationwide survey currently available. From its annual releases, we are able to examine the city’s detailed demographic, socioeconomic, and housing characteristics. This is an extract of the ${subject} indicators as a standalone table, extracted from the file geodatabase published by the New York City Department of City Planning at [https://www1.nyc.gov/site/planning/data-maps/open-data/dwn-acs-nta.page](https://www1.nyc.gov/site/planning/data-maps/open-data/dwn-acs-nta.page)

## This is a spatial dataset

This dataset includes a geometry column which can be used for mapping and GIS work.

## Why This Dataset Exists

This dataset was created to make this NTA-level ACS data more easily available to those who need it.  Since it is published as a file geodatabase, additional work is needed to convert it to more commonly used formats such as shapefile or CSV.

## How to Convert this dataset's body into a shapefile

This dataset includes a column called \`geometry\` that includes a [Well-known Text](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry) Geometry for each row.  You can use desktop GIS software such as QGIS to import this CSV and view the geometries.  From there you can export it to shapefile if you need to.

## How this dataset was created

The dataset was created using a series of commands and scripts.  First, \`ogr2ogr\` was used to extract CSVs from the original file geodatabase.  Next, a node.js script was used to generate the qri dataset's schema, meta, and readme.  The schema is important, as the column names include obscure codes.  The definitions for each column are now part of the qri dataset, making it easier to find a specific column of interest.  The code for the original creation scripts is published on github at [https://github.com/qri-io/data-stories-scripts/tree/master/nyc-nta-acs](https://github.com/qri-io/data-stories-scripts/tree/master/nyc-nta-acs)

  `
}

const main = async () => {
  // get the field names and definitions
  const csvFilePath='./csv/NTA_ACS_DATA_DICTIONARY.csv'
  const fields = await csv().fromFile(csvFilePath)

  subjects.forEach(async (subject) => {
    const datasetName = `nta-acs-${subject.toLowerCase()}`
    // create a new folder to house the dataset components
    fs.ensureDirSync(`./qri/${datasetName}`)

    // add the csv as body.csv
    fs.copySync(`./csv/NTA_ACS_${subject}.csv`, `./qri/${datasetName}/body.csv`)

    // craft a structure.json from the csvt
    const structure = await createStructure(subject, fields)
    // save it
    fs.writeFileSync(`./qri/${datasetName}/structure.json`, JSON.stringify(structure, null, 2))

    // craft a meta.json
    const meta = createMeta(subject)
    // save it
    fs.writeFileSync(`./qri/${datasetName}/meta.json`, JSON.stringify(meta, null, 2))

    // craft a readme
    const readme = createReadme(subject)
    // save it
    fs.writeFileSync(`./qri/${datasetName}/readme.md`, readme)
  })
}


main()
