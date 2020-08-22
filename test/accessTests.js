const axeRgaa = require('./aXeRGAA.json')
const AxeBuilder = require('axe-webdriverjs')
const axeFrStrings = require('axe-core/locales/fr.json')
const runTests = require('./testingCommon')
const {Builder, By, Key, until} = require('selenium-webdriver')


async function checkPage(page) {
  let driver = await new Builder().forBrowser('chrome').usingServer('http://localhost:9515').build()
  let res;
  try {
    await driver.get(page)
    // the twitter widget is an external content, thus out of scope
    await AxeBuilder(driver).configure({locale: axeFrStrings}).withRules(Object.keys(axeRgaa)).exclude('#twitter-widget-0').analyze(function(err, results) {
        if (err) {
            console.error(err)
        }
        res = results
    })

  } finally {
    await driver.quit()
  }
  return res;
}

function mapRgaa(results) {
    return results.map(e => { e.rgaa = axeRgaa[e.id]; return e} )
}

function tagErrors(errors, url, confidence){
    return errors.map(e => {e.url = url; e.confidence = confidence; return e})
}

function analyse(page, result) {
    const results = tagErrors(mapRgaa(result.violations), page, 'violation')
            .concat(tagErrors(mapRgaa(result.incomplete), page, 'needs-review'))
    if (results.length > 0) {
        console.log('❌', page)
    } else {
        console.log('✅', page)
    }
    return results
}

function reporting(errors) {
  console.log(errors)
}

runTests(checkPage, analyse, reporting)
