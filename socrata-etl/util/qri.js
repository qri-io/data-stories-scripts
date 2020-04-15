const fs = require('fs-extra')
const { spawn } = require('child_process')

module.exports = {
  save: (datasetName, dirPath) => {
    console.log(`saving qri dataset`)
    return new Promise((resolve, reject) => {
      try {
        const child = spawn(`qri save --body ${dirPath}/body.csv  --file ${dirPath}/meta.json --file ${dirPath}/readme.md --file ${dirPath}/structure.json me/${datasetName}`, [], { shell: true, stdio: [process.stdin, process.stdout, process.stderr] })
        child.on('exit', () => {
          console.log('done!')
          resolve()
        })

      } catch(e) {
        reject(e)
      }
    })
  },
  publish: (datasetName) => {
    return new Promise((resolve, reject) => {
      try {

        const child = spawn(`qri publish me/${datasetName}`, [], { shell: true, stdio: [process.stdin, process.stdout, process.stderr] })
        child.on('exit', () => {
          resolve()
        })

      } catch(e) {
        reject(e)
      }
    })
  }
}
