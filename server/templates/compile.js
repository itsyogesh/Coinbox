const mjml = require('mjml')
const glob = require('glob')
const path = require('path')
const fs = require('fs')

const templateGlob = path.join(path.resolve(__dirname, process.argv[2]), '**/*.mjml')

glob(templateGlob, (err, files) => {
  if (err) console.log(err)
  if (files && files.length) {
    files.forEach(file => {
      let mjmlText, htmlOutput, outputName, outputPath
      try {
        mjmlText = fs.readFileSync(file, 'utf8')
        console.log(mjmlText)
        htmlOutput = mjml.mjml2html(mjmlText).html
        console.log(htmlOutput)
        outputName = path.basename(file, '.mjml')
        outputPath = path.join(path.parse(file).dir, `${outputName}.html`)
        fs.writeFileSync(outputPath, htmlOutput, 'utf8')
        console.log(`Successfully compiled ${outputName}`)
      } catch (err) {
        console.log(err)
      }
    })
  }
})
