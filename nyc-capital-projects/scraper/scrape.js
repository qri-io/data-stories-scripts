const fs = require('fs-extra')
const util = require('util')
var extract = util.promisify(require('pdf-text-extract'))

const processProject = require('./process-project')

const findFirstPage = (pages) => {
  for (var i = 0; i < pages.length; i += 1) {
    if (pages[i].includes('CAPITAL CONSTRUCTION PROJECT DETAIL DATA')) {
      return i
    }
  }
}

// iterate over pdfs in /pdf
const pdfs = fs.readdirSync('./pdf')
console.log(pdfs)


pdfs.forEach(async (pdf) => {
  console.log(`./pdf/${pdf}`)
  const pages = await extract(`./pdf/${pdf}`)

  // find start page
  const startPage = findFirstPage(pages)
  console.log(`Parsing ${pdf} from page ${startPage}`)
  const projects = []
  for (var i = startPage; i < pages.length; i += 1) {
    const project = processProject(pages[i], pdf)
    projects.push(project)
  }

  // write to file
  fs.ensureDirSync('./json')
  const output = fs.writeFileSync(`./json/${pdf.split('.')[0]}.json`, JSON.stringify(projects))
})
