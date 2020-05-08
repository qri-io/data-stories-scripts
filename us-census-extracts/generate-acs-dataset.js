const fetch = require('node-fetch');
const cheerio = require('cheerio')
const { writer } = require('./util/io');
const { Parser } = require('json2csv');
const SLUGIFY = require('slugify');

const slugify = (d) => {
  return SLUGIFY(d ,{
    replacement: '-',
    lower: true,
    strict: true
  })
}

const getBody = async (options, apiCall, columnLookup) => {
  const { year, product, table, geography } = options

  try {
    const json = await fetch(apiCall)
      .then(d => d.json())


        // NAME column is duplicated
        // GEO_ID and state are the other non-metric columns

        // re-order keys by their metric id
        // preferred order is name, C03_001E, C03_001M, C01_001E, C01_001M
        // this is a lot of code just to get 001 through 040
        // check other tables to make sure they don't skip numbers
        // then just take the max and generate the list?

        // first get all of the metric ids from the header row
        const originalFields = json[0]
        let ids = originalFields.filter(d => d.includes(table.name))
          .map(d => d.split('_')[2].substr(0,3))
        // de-dupe
        ids = [...new Set(ids)]
        // sort
        ids = ids.sort()

        // get the columns (C01, C02, etc).  Some have two, some have 3, etc
        let columns = originalFields.filter(d => d.includes(table.name))
          .map(d => d.split('_')[1])

        // de-dupe
        columns = [...new Set(columns)]
        // sort
        columns = columns.sort()

        console.log('columns', columns)

        // now make the new fields order
        // we only want C01 and C03, C02, is the percent distribution,
        // which can be calculated from C01.  We exclude it to make the table smaller
        // and easier to grok
        let orderedMetricFields = []
        ids.forEach((id) => {
          let idFields = []
          columns.forEach((column) => {
            idFields = [...idFields, `${table.name}_${column}_${id}E`, `${table.name}_${column}_${id}M`,]
          })
          orderedMetricFields = [...orderedMetricFields, ...idFields]
        })
        const orderedFields = ['NAME', ...orderedMetricFields, 'GEO_ID']
        console.log(orderedFields)

        // get rid of the header row
        json.shift()

        // convert array of arrays to array of objects
        let arrayOfObjects = json.map((d) => {
          // convert row into an object
          const obj = {}
          originalFields.forEach((field, i) => {
            obj[field] = d[i]
          })

          // order
          const orderedObj = {}
          orderedFields.forEach((field, i) => {
            orderedObj[field] = obj[field]
          })
          return orderedObj
        })



        // lookup each key and replace it
        arrayOfObjects = arrayOfObjects.map((obj) => {
          const newObj = {}
          Object.keys(obj).forEach((key) => {
            // set NAME to lowercase
            if (key === 'NAME') {
              newObj.name = obj.NAME
              return
            }

            const match = columnLookup.find(d => d.name === key)
            if (match) {
              const newKey = match.newLabel
              newObj[newKey] = obj[key]
            } else {
              newObj[key] = obj[key]
            }
          })

          return newObj
        })

        // sort by state name

        arrayOfObjects = arrayOfObjects.sort((a, b) => {
           if(a.name < b.name) { return -1; }
           if(a.name > b.name) { return 1; }
           return 0;
        })

        return arrayOfObjects
  } catch(e) {
    console.log(e)
  }



}

const getMeta = (options, apiCall) => {
  const { table, geography, year, product } = options
  return {
    qri: 'md:0',
    title: `${year} American Community Survey ${product[3]}-year estimates - Subject Table ${table.name} - ${table.label} - U.S. by ${geography}`,
    theme: [ 'U.S. Census', 'American Community Survey', 'Demographics' ],
    keywords: [ 'U.S. Census', 'American Community Survey', 'Demographics', `ACS table ${table.name}`, table.label ],
    description: `Subject Table ${table.name} (${table.label}) from the ${year} American Community Survey ${product[3]}-year estimates.  This table contains info for the entire U.S. with each row representing a ${geography}.  The American Community Survey (ACS) is an ongoing survey that provides vital information on a yearly basis about the United States and its people. This qri dataset was programatically-generated using the census API.  See the readme for more details.`,
    accessUrl: apiCall
  }
}

const getReadme = (options, meta) => {
  return `# ${meta.title}

${meta.description}

## About the American Community Survey

From [Understanding the ACS: The Basics](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch01.pdf):

The American Community Survey (ACS) is a nationwide survey designed to provide communities with reliable and timely social, economic, housing, and demographic data every year.

The ACS has an annual sample size of about 3.5 million addresses, with survey information collected nearly every day of the year. Data are pooled across a calendar year to produce estimates for that year. As a result, ACS estimates reflect data that have been collected over a period of time rather than for a single point in time as in the decennial census, which is conducted every 10 years and provides population counts as of April 1.

ACS 1-year estimates are data that have been collected over a 12-month period and are available for
geographic areas with at least 65,000 people. The
Census Bureau combines 5 consecutive years of ACS
data to produce estimates for geographic areas with
fewer than 65,000 residents. These 5-year estimates
represent data collected over a period of 60 months.1

### Estimates, not hard counts

ACS data are __estimates__, and each value in the data has a corresponding margin of error.  It is important to [understand error and how to determine statistical significance](https://www.census.gov/content/dam/Census/library/publications/2018/acs/acs_general_handbook_2018_ch07.pdf) when using ACS data.

### Further Reading
- [Understanding and Using American Community Survey Data: What All Data Users Need to Know](https://www.census.gov/programs-surveys/acs/guidance/handbooks/general.html)
- [A Compass for Understanding and Using American Community Survey Data (pdf)](https://www.census.gov/content/dam/Census/library/publications/2008/acs/ACSGeneralHandbook.pdf)

## How this Qri Dataset was Generated

This dataset was created as part of a project at Qri to create American Community Survey tables that are easier to discover and use.  All census tables are created and published under the namespace \`us-census-extracts\`  Getting a table of ACS data requires either navigating a web UI to make detailed selections about the data product and geography level.  We want to make each table its own standalone dataset, complete with a readme, metadata, and structure information such as column descriptors.

The pipeline that produced this dataset also applied a few transformations that add value to make the dataset easier to use.  An overview of the steps is as follows (full code is [published on github](https://github.com/qri-io/data-stories-scripts/tree/master/us-census-extracts)):

1. Use the census API to pull down the subject table data for the specified year, acs product (1-year estimates, 5-year estimates, etc), and geography level (US by state, Maryland by county, etc)

2. Remove percent distribution columns - Percent Distribution can be inferred from the \`number\` columns, and reduces the number of columns by 33%.

3. Replace column names - The raw data include codes for each column name.  For example, the column \`S1903_C01_001E\` represents the estimated number of households in the associated geography for the Median Income in the last 12 months subject table(S9103).  The census provides a lookup table with a hierarchy of strings that describe the column: \`Estimate!!Number!!HOUSEHOLD INCOME BY RACE AND HISPANIC OR LATINO ORIGIN OF HOUSEHOLDER!!Households\`.  Our pipeline further simplified these into more easily readable slugs: \`median-income-dollars_household-income-by-race-and-hispanic-or-latino-origin-of-householder_households\`

4. Change column order - To make it easier to get familiar with the data, we arranged the columns with the following pattern (similar to how the tables are displayed on data.census.gov):
- geography name - This describes the row, so we want it first
- variable 1
  - column 1 value
  - column 1 moe
  - column 2 value
  - column 2 moe
  - ... repeat for all columns
- variable 2
  - column 1 value
  - column 1 moe
  - column 2 value
  - column 2 moe
  - ... repeat for all columns
- ... repeat for all variables
- GEO_ID for the geography, useful for joining with geometries for

5. Sort by geography name - This makes it easier for humans to find a given row when looking at a data table.

## How can we improve this dataset?

Did we get something wrong?  Did we do something good? Is there another cut of ACS data that would be really helpful to you?  [Give us a yell on twitter at @qri_io](https://twitter.com/qri_io) and let us know!

`
}

const getStructure = (body, columnLookup) => {
  // columnLookup may have more values than are actually in the dataset
  const items = Object.keys(body[0]).map((key) => {
    const match = columnLookup.find(d => d.newLabel === key)

    return {
      title: key,
      description: match ? match.description : key,
      type: 'string'
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

const generateACSDataset = async (options) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { table, geography, year, product } = options

      const apiCall = `https://api.census.gov/data/${year}/acs/${product}/subject?get=group(${table.name})&for=${geography}:*`

      // replace original keys with more human-friendly keys
      // scrape variables from https://api.census.gov/data/2018/acs/acs5/subject/groups/S1903.html
      const html = await fetch(`https://api.census.gov/data/${year}/acs/${product}/subject/groups/${table.name}.html`).then(d => d.text())
      const $ = cheerio.load(html);

      const rows = $('tbody > tr');

      const columnLookup = rows.map((i, row) => {
        const tds = $(row).find('td')
        const name = $(tds[0]).text();
        const label = $(tds[1]).text();
        const parts = label.split('!!').map(d => slugify(d))

        parts.shift()

        return {
          name,
          label,
          newLabel: parts.join('_'),
          description: `ACS Column Name ${name}, ${label.split('!!').join(',')}`
        }
      }).get()


      const body = await getBody(options, apiCall, columnLookup)
      const meta = await getMeta(options, apiCall)
      const readme = await getReadme(options, meta)
      const structure = await getStructure(body, columnLookup)

      // data/2018/acs/acs5/subject?
      const datasetName = `acs-${year}-${product[3]}-year-estimates-subject-table-${slugify(table.name)}-us-by-${geography}`

      await writer(`tmp/${datasetName}/body.csv`, new Parser().parse(body))
      await writer(`tmp/${datasetName}/meta.json`, meta)
      await writer(`tmp/${datasetName}/readme.md`, readme)
      await writer(`tmp/${datasetName}/structure.json`, structure)

      resolve()
    } catch (e) {
      reject(e)
    }

  })
}

module.exports = generateACSDataset
