require('dotenv').config()
const path = require('path')
const { I18n } = require('i18n')
const axeRgaa = require('.'+path.sep+'aXeRGAA.json')
const AxeBuilder = require('@axe-core/webdriverjs')
const axeFrStrings = require('..'+path.sep+'locales'+path.sep+'axe4-fr.json')
//const axeFrStrings = require('..'+path.sep+'node_modules'+path.sep+'axe-core'+path.sep+'locales'+path.sep+'fr.json')
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
  const driver = await new Builder().forBrowser('firefox').usingServer('http://localhost:4444').build()
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
    await new AxeBuilder(driver).configure(axeSettings).withRules(Object.keys(axeRgaa)).exclude('.gouvernemental_messenger').analyze(function(err, results) {
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
    let driver = await new Builder().forBrowser('firefox').usingServer('http://localhost:4444').build()
    try {
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
            .flatMap(e => { // manage cases where multiple criteria match
              if (typeof e.rgaa == "string") { 
                return e 
              } else {
                return e.rgaa.map(crit => {
                  const res = JSON.parse(JSON.stringify(e)); 
                  res.rgaa = crit; 
                  return res
                })
              }
            })
}

// analyseAxe: analyses the results of the audit by axe for one page
// cleanup of the data, display some feedback to the user
function analyseAxe(page, result) {
    //console.log('analyse', result)
    // we only keep errors in the "violation" and "needs-review" categories
    // and we filter out "needs review" for 3.2 because they are too frequent and not helping
    const results = tagErrorsAxe(result.violations, page, 'violation')
            .concat(tagErrorsAxe(result.incomplete, page, 'needs review')).filter(e => {return !(e.confidence == 'needs review' && e.rgaa == '3.2')})

    if (results.length > 0) {
        console.log('FAIL: axe ', results.length, page)
    } else {
        console.log('PASS: axe ', page)
    }
    return results
}

// imported from the bookmarklet of Steve Faulkner, available here: https://validator.w3.org/nu/about.html
// new version available here https://github.com/stevefaulkner/wcagparsing explanations here: https://cdpn.io/stevef/debug/VRZdGJ
// just removed "not allowed on element" as it seems to be unnecessary for the RGAA to report unknown attributes

const filterStrings = [
  "tag seen",
  "Stray end tag",
  "Bad start tag",
  "violates nesting",
  "Duplicate ID",
  "first occurrence of ID",
  "Unclosed element",
  "not allowed as child of",
  "unclosed elements",
  "unquoted attribute value",
  "Duplicate attribute",
  "tabindex must not", 
  "not appear as a descendant of"
];

// analyseValidator: analyses the results of the test by the W3C validator for one page
// cleanup of the data, display some feedback to the user
function analyseW3C(page, res) {
  const validationIssue = {'id': 'w3c-validator', 
                  'rgaa': '8.2', 
                  'url': page, 
                  'description': i18n.__('Please check that the HTML source code is valid'), 
                  'help': i18n.__('Please use the W3C HTML validator'),
                  'helpUrl': 'https://validator.w3.org/nu/',
                  confidence: 'violation', 
                  impact: 'serious'}
  const missingDoctypeIssue = {'id': 'w3c-validator', 
  'rgaa': '8.1', 
  'url': page, 
  'description': i18n.__('Please check the doctype of the page'), 
  'help': i18n.__('Please use the W3C HTML validator'),
  'helpUrl': 'https://validator.w3.org/nu/',
  confidence: 'violation', 
  impact: 'serious'}


  const filterRE = filterStrings.join("|");
  const nodes = res.messages.filter(e => {return (e.type == 'error')}).filter(e => { return (e.message.match(filterRE) !== null)}).map(e => {e.target = [e.extract]; e.failureSummary = e.message; return e;})

  // find doctype errors 
  missingDoctypeIssue.nodes = nodes.filter(e => {return (e.failureSummary.includes('doctype'))})
  validationIssue.nodes = nodes.filter(e => {return (!e.failureSummary.includes('doctype'))})

  const result = []
  if (missingDoctypeIssue.nodes.length > 0) {
    result.push(missingDoctypeIssue)
  }
  if (validationIssue.nodes.length > 0) {
    result.push(validationIssue)
  }

  if (nodes.length > 0) {
      console.log('FAIL: w3c ', nodes.length, page)
  } else {
      console.log('PASS: w3c ', page)
  }
  return result
}

runTests([checkWithAxe, checkWithW3CValidator], genReport, i18n)
