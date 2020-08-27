require('dotenv').config()
const path = require('path')
const axeRgaa = require('.'+path.sep+'aXeRGAA.json')
const AxeBuilder = require('axe-webdriverjs')
const axeFrStrings = require('..'+path.sep+'locales'+path.sep+'axe-fr.json')
const runTests = require('.'+path.sep+'testingCommon')
const genReport = require('.'+path.sep+'reporting')
const {Builder, By, Key, until} = require('selenium-webdriver')
const lang = (process.env.LANGUAGE == 'en')?'en':'fr'

// checkPage: checks one page with aXe and Selenium-webdriver
async function checkPage(page) {
  const axeSettings = (lang == 'fr')?{locale: axeFrStrings}:{}
  let driver = await new Builder().forBrowser('chrome').usingServer('http://localhost:9515').build()
  let res;

  try {
    // if we are behind a login, then we try to login
    if (process.env.LOGIN_PAGE !== undefined) {
      await driver.get(process.env.LOGIN_PAGE)
      await driver.findElement(By.css(process.env.LOGIN_USERNAME_SELECTOR)).sendKeys(process.env.LOGIN_USERNAME)
      await driver.findElement(By.css(process.env.LOGIN_PASSWORD_SELECTOR)).sendKeys(process.env.LOGIN_PASSWORD)
      await driver.findElement(By.css(process.env.LOGIN_BUTTON_SELECTOR)).click()
    }

    // get the page
    await driver.get(page)

    // analyse the page
    // .gouvernemental_messenger is excluded from all pages
    await AxeBuilder(driver).configure(axeSettings).withRules(Object.keys(axeRgaa)).exclude('.gouvernemental_messenger').analyze(function(err, results) {
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


// tagErrors: annotates the results of the tests with the related RGAA criteria
function tagErrors(errors, url, confidence){
    return errors
            .map(e => { e.rgaa = axeRgaa[e.id]; return e})
            .map(e => {e.url = url; e.confidence = confidence; return e})
            .map(e => {e.context = {}; e.context[e.url] = e.nodes; return e})
}

// analyse: analyses the results of the audit coming from one page
// cleanup of the data, display some feedback to the user
function analyse(page, result) {
    // we only keep errors in the "violation" and "needs-review" categories
    const results = tagErrors(result.violations, page, 'violation')
            .concat(tagErrors(result.incomplete, page, 'needs-review'))
    if (results.length > 0) {
        console.log('❌', results.length, page)
    } else {
        console.log('✅', page)
    }
    return results
}

// reporting: generates a report to the user
function reporting(errors, pages) {
  const groupByRGAA = {}
  errors.forEach(e => {
    if (groupByRGAA[e.rgaa] === undefined) {
      groupByRGAA[e.rgaa] = [e]
    } else {
      let double = groupByRGAA[e.rgaa].find(f => f.id == e.id)
      if (double !== undefined) {
        double.context = {...double.context, ...e.context}
      } else {
        groupByRGAA[e.rgaa].push(e)
      }
    }
  })
  genReport(groupByRGAA, pages, lang)
}

runTests(checkPage, analyse, reporting)
