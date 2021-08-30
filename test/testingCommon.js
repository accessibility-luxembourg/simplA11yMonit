const fetch = require('node-fetch')
const cheerio = require('cheerio')

// getPages: get the list of urls to analyse from command line parameters
function getPages() {
    const pages = process.argv.slice(2, process.argv.length).map(e => {return e.trim()}).filter(e => {return (e.length != 0);})
    if (pages.length != 3) {
        console.error('Error: 3 urls are needed as parameters')
        console.error('Parameters received: ', pages)
        process.exit(1)
    } else {
        return pages
    }
}

// checkPages: tests a list of URLs with check and then analyse the results
async function checkPages(pages, check) {
    let errors = [];
    for (const p of pages) {
        let result = await check(p)
        errors = errors.concat(result)
    }
    return errors;
}


async function getTitles(pages) {
    return Promise.all(pages.map(page => {
        const pageId = pages.indexOf(page) + 1
        return fetch(page).then(res => { return res.text() }).then(body => {
            const $ = cheerio.load(body)
            const title = $("title").text()
            return title;
        })
    }))
}

// https://stackoverflow.com/questions/24586110/resolve-promises-one-after-another-i-e-in-sequence
const serial = funcs =>
    funcs.reduce((promise, func) =>
        promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]))

// runTests: the main function launching tests and then the reporting
function runTests(checks, reporting, i18n) {
    const pages = getPages()

    getTitles(pages).then(titles => {
        const pChecks = checks.map(e => () => {return checkPages(pages, e)})
        serial(pChecks).then(errors => {
            errors = [].concat(...errors)
            //console.log('nr of errors: ', errors.filter(e => {return (e.status != 'na')}).length)
            reporting(errors, pages, titles, i18n)
            process.exit(0)
        }).catch(error => { 
            console.error('error', error.message)
            process.exit(1)
         });


    }).catch(error => { 
        console.log('error', error.message)
        process.exit(1)
     });


}

exports = module.exports = runTests;
exports.default = runTests;