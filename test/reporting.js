const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const MarkdownIt = require('markdown-it')
const config = require('..'+path.sep+'config.json')

const criteres = JSON.parse(fs.readFileSync('.'+path.sep+'RGAA'+path.sep+'criteres.json'))

// generate criteria
const mdCriteres = MarkdownIt({
    replaceLink: function (link, env) {
        if (!link.match(/^#test-|#crit-|https?:\/\//)) {
            return 'https://accessibilite.public.lu/fr/rgaa4/glossaire.html'+link
        }
        return link
    }
}).use(require('markdown-it-replace-link'))

function renderToFile(data,  file, pages, lang) {
    ejs.renderFile('.'+path.sep+'tpl'+path.sep+lang+path.sep+'main.ejs', {data: data, pages: pages, lang: lang}, function(err, str){
        if (err !== null) {
            console.log(err)
        }
        fs.writeFileSync(file, str)
    });
}

function genReport(data, pages, lang) {

    ejs.renderFile('.'+path.sep+'tpl'+path.sep+lang+path.sep+'criteria.ejs',{topics: criteres.topics, errors: data, md: mdCriteres, shortList: config.shortList}, function(err, str) {
        if (err !== null) {
            console.log(err)
        }
        renderToFile(str,  "."+path.sep+"out"+path.sep+"audit.html", pages, lang)
    })
}

exports = module.exports = genReport;
exports.default = genReport;