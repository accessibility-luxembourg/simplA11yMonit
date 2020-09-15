require('dotenv').config()
const path = require('path')
const { I18n } = require('i18n')
const axeRgaa = require('.'+path.sep+'aXeRGAA.json')
const AxeBuilder = require('axe-webdriverjs')
const axeFrStrings = require('..'+path.sep+'locales'+path.sep+'axe-fr.json')
const runTests = require('.'+path.sep+'testingCommon')
const genReport = require('.'+path.sep+'reporting')
const {Builder, By, Key, until} = require('selenium-webdriver')
const validator = require('html-validator')


const i18n = new I18n({
  locales: ['en', 'fr'],
  directory: path.join(__dirname, '..', 'locales')
})
const lang = (process.env.LANGUAGE == 'en')?'en':'fr'
i18n.setLocale(lang)

// checkWithAxe: checks one page with aXe and Selenium-webdriver
async function checkWithAxe(page) {
  const axeSettings = (lang == 'fr')?{locale: axeFrStrings}:{}
  let driver = await new Builder().forBrowser('firefox').usingServer('http://localhost:4444').build()
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
  return analyseAxe(page, res);
}

async function checkWithW3CValidator(page) {
  let res;
  let options;

  // if we are behind a login, me must use selenium
  if (process.env.LOGIN_PAGE !== undefined) {
    try {
      let driver = await new Builder().forBrowser('chrome').usingServer('http://localhost:9515').build()
      await driver.get(process.env.LOGIN_PAGE)
      await driver.findElement(By.css(process.env.LOGIN_USERNAME_SELECTOR)).sendKeys(process.env.LOGIN_USERNAME)
      await driver.findElement(By.css(process.env.LOGIN_PASSWORD_SELECTOR)).sendKeys(process.env.LOGIN_PASSWORD)
      await driver.findElement(By.css(process.env.LOGIN_BUTTON_SELECTOR)).click()
      // get the page
      await driver.get(page)

      let src = await driver.getPageSource()
    } finally {
      await driver.quit()
    }
    options = {
      url: page,
      format: 'json',
      data: src
    }
  } else {
    // if we are not behind a login, we avoid selenium, as the html provided is already parsed by the browser and without doctype
    options = {
      url: page,
      format: 'json'
    }      
  }

  res = await validator(options)


  return analyseW3C(page, res);
}

// tagErrorsAxe: annotates the results of the tests with the related RGAA criteria
function tagErrorsAxe(errors, url, confidence){
    return errors
            .map(e => { e.rgaa = axeRgaa[e.id];  return e})
            .map(e => {e.url = url; e.confidence = confidence; return e})
            .map(e => {e.context = {}; e.context[e.url] = e.nodes; return e})
}

// analyseAxe: analyses the results of the audit by axe for one page
// cleanup of the data, display some feedback to the user
function analyseAxe(page, result) {
    //console.log('analyse', result)
    // we only keep errors in the "violation" and "needs-review" categories
    const results = tagErrorsAxe(result.violations, page, 'violation')
            .concat(tagErrorsAxe(result.incomplete, page, 'needs review'))
    if (results.length > 0) {
        console.log('FAIL: axe ', results.length, page)
    } else {
        console.log('PASS: axe ', page)
    }
    return results
}

// imported from the bookmarklet of Steve Faulkner, available here: https://validator.w3.org/nu/about.html
// just removed "not allowed on element" as it seems to be unnecessary for the RGAA to report unknown attributes

const filterStrings = [
  "tag seen",
  "Stray end tag",
  "Bad start tag",
  "violates nesting rules",
  "Duplicate ID",
  "first occurrence of ID",
  "Unclosed element",
  "not allowed as child of element",
  "unclosed elements",
  "unquoted attribute value",
  "Duplicate attribute",
];

// analyseValidator: analyses the results of the test by the W3C validator for one page
// cleanup of the data, display some feedback to the user
function analyseW3C(page, res) {
  const result = {'id': 'w3c-validator', 
                  'rgaa': '8.2', 
                  'url': page, 
                  'description': i18n.__('Please check that the HTML source code is valid'), 
                  'help': i18n.__('Please use the W3C HTML validator'),
                  'helpUrl': 'https://validator.w3.org/nu/',
                  confidence: 'violation', 
                  impact: 'serious'}
  result.context = {}
  const filterRE = filterStrings.join("|");
  result.context[page] = res.messages.filter(e => {return (e.type == 'error')}).filter(e => { return (e.message.match(filterRE) !== null)}).map(e => {e.target = [e.extract]; e.failureSummary = e.message; return e;})


  if (result.context[page].length > 0) {
      console.log('FAIL: w3c ', result.context[page].length, page)
      return [result]
  } else {
      console.log('PASS: w3c ', page)
      return []
  }
}

// reporting: generates a report to the user
function reporting(errors, pages, i18n) {
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
  // cleanup occurences
  Object.keys(groupByRGAA).forEach(e => {
    groupByRGAA[e].forEach(error => {
      Object.keys(error.context).forEach(url =>  {
        error.context[url] = cleanupOccurences(error.context[url])
      })
    })
  })

  genReport(groupByRGAA, pages, i18n)
}

function cleanupOccurences(tabNodes) {
  const result = {}
  tabNodes.forEach(node => {
    if (result[node.failureSummary] === undefined) {
      result[node.failureSummary] = [node]
    } else {
      result[node.failureSummary].push(node)
    }
  })
  return result;
}


runTests([checkWithAxe, checkWithW3CValidator], reporting, i18n)
