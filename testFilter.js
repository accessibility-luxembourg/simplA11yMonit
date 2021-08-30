const {Builder, By, Key, until} = require('selenium-webdriver')

function getNRImagesWithoutLinks() {
  function isImageLink(e) {
    return (e.parentNode.nodeName == 'A' && e.nextElementSibling == null && e.previousElementSibling == null) 
  }
  return Array.from(document.querySelectorAll('img, [role="img"], area, input[type="image"], svg, object[type="image"], embed[type="image"], canvas')).filter(e => { return !isImageLink(e)}).filter(e => {return !(window.getComputedStyle(e).display === "none")}).length
}

async function preconditionChecks(page) {
  const driver = await new Builder().forBrowser('firefox').usingServer('http://localhost:4444').build()
  const results = {}
  try {  
      // get the page
      await driver.get(page)
      results['img'] = await driver.executeScript(getNRImagesWithoutLinks)
      results['iframe'] = (await driver.findElements(By.css('frame, iframe'))).length
      results['table'] = (await driver.findElements(By.css('table, [role="table"]'))).length
      results['form'] = (await driver.findElements(By.css('form, [role="form"]'))).length
      results['formElts'] = (await driver.findElements(By.css('input[type="text"], input[type="password"], input[type="search"], input[type="email"], input[type="number"],input[type="tel"], input[type="url"], textarea, input[type="checkbox"], input[type="radio"], input[type="date"], input[type="range"], input[type="color"], input[type="time"], input[type="month"], input[type="week"], input[type="date-local"], select, datalist, optgroup, option, input[type="file"], output, progress, meter, [role="progressbar"], [role="slider"], [role="spinbutton"], [role="textbox"], [role="listbox"], [role="searchbox"], [role="combobox"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"]'))).length
      results['link'] = (await driver.findElements(By.css('link, [role="link"]'))).length
      results['lang'] = (await driver.findElements(By.css('body [lang]'))).length

    } finally {
      await driver.quit()
    }
    return results
}

const page = process.argv[2]
preconditionChecks(page).then(res => {
  console.log(page + ',' + res['img'] + ',' + res['iframe'] + ',' +  res['table'] + ',' +  res['form'] + ',' + res['formElts'] + ',' + res['link'] + ',' + res['lang'])
}).catch(e => {
  console.error('error', e)
})




