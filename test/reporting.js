const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const MarkdownIt = require('markdown-it')
const { env } = require('process')
const config = require('..'+path.sep+'config.json')

// load rgaa criteria
const criteres = JSON.parse(fs.readFileSync('.'+path.sep+'RGAA'+path.sep+'criteres.json'))

// markdown parser for the title of each criteria
const mdCriteres = MarkdownIt({
    replaceLink: function (link, env) {
        if (!link.match(/^#test-|#crit-|https?:\/\//)) {
            return 'https://accessibilite.public.lu/fr/rgaa4/glossaire.html'+link
        }
        return link
    }
}).use(require('markdown-it-replace-link'))

// renderToFile: generates a file based on the main.ejs template
function renderToFile(data,  file, pages, lang) {
    ejs.renderFile('.'+path.sep+'tpl'+path.sep+lang+path.sep+'main.ejs', {data: data, pages: pages, lang: lang}, function(err, str){
        if (err !== null) {
            console.log(err)
        }
        fs.writeFileSync(file, str)
    });
}

// genReport: generates a report, based on the criteria.ejs template
function genReport(data, pages, lang) {
    const outFile = "."+path.sep+"out"+path.sep+"audit.html";
    ejs.renderFile('.'+path.sep+'tpl'+path.sep+lang+path.sep+'criteria.ejs',{topics: criteres.topics, errors: data, md: mdCriteres, shortList: config.shortList}, function(err, str) {
        if (err !== null) {
            console.log(err)
        }
        renderToFile(str,  outFile, pages, lang)
    })
    if (process.env.VIEWER !== undefined) {
        const {exec} = require("child_process")
        exec(process.env.VIEWER+ ' ' + outFile).unref()
    }
}

exports = module.exports = genReport;
exports.default = genReport;