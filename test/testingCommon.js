function getPages() {
    if (process.argv.length < 2) {
        console.log('not enough arguments')
        process.exit(1)
    } else {
        return process.argv.slice(2, process.argv.length)
    }
}

async function checkPages(pages, check, analyse) {
    let errors = [];
    for (const p of pages) {
        let result = await check(p)
        errors = errors.concat(analyse(p, result))
    }
    return errors;
}

function runTests(check, analyse, reporting) {
    const pages = getPages()
    checkPages(pages, check, analyse).then(errors => {
        console.log('nr of errors: ', errors.length)
        reporting(errors)
        process.exit(errors.length)
    }).catch(error => { 
        console.error('error', error.message)
        process.exit(1)
     });
}

exports = module.exports = runTests;
exports.default = runTests;