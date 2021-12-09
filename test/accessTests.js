require('dotenv').config()
const path = require('path')
const fs = require('fs')
const { I18n } = require('i18n')
const axeRgaa = require('.'+path.sep+'aXeRGAA.json')
const AxeBuilder = require('@axe-core/webdriverjs')
const axeFrStrings = require('..'+path.sep+'locales'+path.sep+'axe4-fr.json')
const runTests = require('.'+path.sep+'testingCommon')
const genReport = require('.'+path.sep+'reporting')
const {Builder, By, Key, until} = require('selenium-webdriver')
const validator = require('html-validator')
// strings in english coming from the source code of the W3C validator (different packages in this organisation https://github.com/validator )
// not found:  "tabindex must not"
const tradFR = require('..'+path.sep+'locales'+path.sep+'validator-fr.json')

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
    // special configuration for Luxembourg: .gouvernemental_messenger is excluded from all pages
    // FIXME: should be moved to a config file or environment variable
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


function getNRImagesWithoutLinks() {
  function isImageLink(e) {
    return (e.parentNode.nodeName == 'A' && e.nextElementSibling == null && e.previousElementSibling == null) 
  }
  return Array.from(document.querySelectorAll('img, [role="img"], area, input[type="image"], svg, object[type="image"], embed[type="image"], canvas')).filter(e => { return !isImageLink(e)}).filter(e => {return !(window.getComputedStyle(e).display === "none")}).length
}

// check if some elements exist in the page, otherwise return NA
async function checkPreconditions(page) {
  const driver = await new Builder().forBrowser('firefox').usingServer('http://localhost:4444').build()
  const mapping = {
    'img': ['1.1', '1.2', '1.3', '1.6', '1.7'],
    'iframe': ['2.1'],
    'table': ['5.6', '5.7'], 
    'formElts': ['11.5', '11.6', '11.7', '11.8', '11.9', '11.10'],
    'form': ['11.1', '11.2'],
    'lang': ['8.8']
  }
  const results = []
  try {  
      // get the page
      await driver.get(page)
      const counters = {}
      counters['img'] = await driver.executeScript(getNRImagesWithoutLinks)
      counters['iframe'] = (await driver.findElements(By.css('frame, iframe'))).length
      counters['table'] = (await driver.findElements(By.css('table, [role="table"]'))).length
      counters['form'] = (await driver.findElements(By.css('form, [role="form"]'))).length
      counters['formElts'] = (await driver.findElements(By.css('input[type="text"], input[type="password"], input[type="search"], input[type="email"], input[type="number"],input[type="tel"], input[type="url"], textarea, input[type="checkbox"], input[type="radio"], input[type="date"], input[type="range"], input[type="color"], input[type="time"], input[type="month"], input[type="week"], input[type="date-local"], select, datalist, optgroup, option, input[type="file"], output, progress, meter, [role="progressbar"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="listbox"], [role="searchbox"], [role="combobox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]'))).length
      counters['lang'] = (await driver.findElements(By.css('body [lang]'))).length

      Object.keys(counters).forEach(precond => {
        if (counters[precond] == 0) {
          mapping[precond].forEach(e => {
            results.push({'rgaa': e, 'url': page, 'status': 'na'})
          })
        }
      })

    } finally {
      await driver.quit()
    }
    return results
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
    // we only keep errors in the "violation" and "needs-review" categories
    // and we filter out "needs review" for 3.2 because they are too frequent and not helping
    const results = tagErrorsAxe(result.violations, page, 'violation').map(e => {e.status = 'nc'; return e; })
            .concat(tagErrorsAxe(result.incomplete, page, 'needs review')).filter(e => {return !(e.confidence == 'needs review' && e.rgaa == '3.2')})

    return results
}

// imported from the bookmarklet of Steve Faulkner, available here: https://validator.w3.org/nu/about.html
// new version available here https://github.com/stevefaulkner/wcagparsing explanations here: https://cdpn.io/stevef/debug/VRZdGJ
// just removed "not allowed on element" as it seems to be unnecessary for the RGAA to report unknown attributes, and removed "Duplicate ID" as it is already reported by Axe

const filterStrings = [
  "tag seen",
  "Stray end tag",
  "Bad start tag",
  "violates nesting",
  "first occurrence of ID",
  "Unclosed element",
  "not allowed as child of",  
  "unclosed elements",
  "unquoted attribute value",
  "Duplicate attribute",
  "tabindex must not", 
  "not appear as a descendant of"
];
                               
function getTrad(str) {
  for (const en in tradFR) {
    if (str.match(en)) {
      const result = str.replace(new RegExp(en), tradFR[en])
      return result;
    }
  }
  console.log('WARN: no translation found for' + str)
  return str
}


// analyseValidator: analyses the results of the test by the W3C validator for one page
// cleanup of the data, display some feedback to the user
function analyseW3C(page, res) {
  const validationIssue = {'id': 'w3c-validator', 
                  'rgaa': '8.2', 
                  'url': page, 
                  'description': i18n.__('Please check that the HTML source code is valid'), 
                  'help': i18n.__('Please use the W3C HTML validator'),
                  'helpUrl': 'https://validator.w3.org/nu/',
                  'status': 'nc'
                }
  const missingDoctypeIssue = {'id': 'w3c-validator', 
  'rgaa': '8.1', 
  'url': page, 
  'description': i18n.__('Please check the doctype of the page'), 
  'help': i18n.__('Please use the W3C HTML validator'),
  'helpUrl': 'https://validator.w3.org/nu/',
  confidence: 'violation', 
  impact: 'serious', 
  status: 'nc'}


  const filterRE = filterStrings.join("|");
  let nodes = res.messages.filter(e => {return (e.type == 'error')}).filter(e => { return (e.message.match(filterRE) !== null)}).map(e => {e.target = [e.extract]; e.failureSummary = e.message.replace('(Suppressing further errors from this subtree.)', '').trim(); return e;})
  nodes = nodes.map(e => {e.failureSummary = getTrad(e.failureSummary); return e;})

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

  return result
}

runTests([checkWithAxe, checkWithW3CValidator, checkPreconditions], genReport, i18n)
