const fs = require('fs')
const processProject = require('./process-project')

var rawText = fs.readFileSync('one-project.txt', 'utf8').split('\n')

const project = processProject(rawText)
console.log(project)
