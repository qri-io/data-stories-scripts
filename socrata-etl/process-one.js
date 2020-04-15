const processDataset = require('./process-dataset')

// for processing a single dataset passed as an argument
// node process-one hiik-hmf3

const id = process.argv[2]
processDataset(id)
