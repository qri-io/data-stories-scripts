const fs = require('fs-extra')
const { spawn } = require('child_process');

module.exports = {
  init: (dirPath) => {
    console.log(`initializing Qri Dataset in ${dirPath}`)
    // make an empty dir
    fs.emptyDirSync(dirPath)

    return new Promise((resolve, reject) => {
      try {

        const child = spawn(`cd ${dirPath} && qri init`, [], { shell: true, stdio: [process.stdin, process.stdout, process.stderr] })
        child.on('exit', () => {
          resolve()
        })

      } catch(e) {
        reject(e)
      }
    })
  },
  save: (dsRef, { body, file }) => {
    console.log(`saving qri dataset`)
    return new Promise((resolve, reject) => {
      try {
        let command = `qri save ${dsRef}`
        if (body) {
          command += ` --body ${body}`
        }

        if (file) {
          file.forEach((filePath) => {
            command += ` --file ${filePath}`
          })
        }
        const child = spawn(command, [], { shell: true, stdio: [process.stdin, process.stdout, process.stderr] })
        child.on('exit', () => {
          console.log('done!')
          resolve()
        })

      } catch(e) {
        reject(e)
      }
    })
  },
  publish: (dsRef) => {
    return new Promise((resolve, reject) => {
      try {

        const child = spawn(`qri publish ${dsRef}`, [], { shell: true, stdio: [process.stdin, process.stdout, process.stderr] })
        child.on('exit', () => {
          resolve()
        })

      } catch(e) {
        reject(e)
      }
    })
  }
}
