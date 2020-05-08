const generateACSDataset = require('./generate-acs-dataset')

// iterate over the subject tables, generate a qri dataset for a specific data product and year.
// we will start with two product/years:  ACS 2018 1-year estimates and 2018 5-year estimates
// we will make a dataset including a row for each U.S. State.

// us-census-extracts/acs-2018-5-year-estimates-table-s1903-median-household-income-by-state

const subjectTables = require('./subject-tables.json')

const loopOverSubjectTables = async () => {
  // for (let i = 0; i < 2; i++) {
  for (let i = 0; i < subjectTables.length; i++) {
    try {
      await generateACSDataset({
        year: 2018,
        product: 'acs1',
        table: subjectTables[i],
        geography: 'state'
      })
    } catch(e) {
      console.log(`error processing ${subjectTables[i].name}`, e)
    }

  }

  for (let i = 0; i < subjectTables.length; i++) {
    try {
      await generateACSDataset({
        year: 2018,
        product: 'acs5',
        table: subjectTables[i],
        geography: 'state'
      })
    } catch(e) {
      console.log(`error processing ${subjectTables[i].name}`, e)
    }

  }
}

loopOverSubjectTables()
