// getPages: get the list of urls to analyse from command line parameters
function getPages() {
    if (process.argv.length < 2) {
        console.log('not enough arguments')
        process.exit(1)
    } else {
        return process.argv.slice(2, process.argv.length)
    }
}

// checkPages: tests a list of URLs with check and then analyse the results
async function checkPages(pages, check, analyse) {
    let errors = [];
    for (const p of pages) {
        let result = await check(p)
        errors = errors.concat(analyse(p, result))
    }
    return errors;
}

// runTests: the main function launching tests and then the reporting
function runTests(check, analyse, reporting) {
    const pages = getPages()
    checkPages(pages, check, analyse).then(errors => {
        console.log('nr of errors: ', errors.length)
        reporting(errors, pages)
        process.exit(errors.length)
    }).catch(error => { 
        console.error('error', error.message)
        process.exit(1)
     });
}

exports = module.exports = runTests;
exports.default = runTests;