const fs = require('fs')
const ejs = require('ejs')
const MarkdownIt = require('markdown-it')
const config = require('../config.json')

const criteres = JSON.parse(fs.readFileSync('../RGAA/criteres.json'))

// generate criteria in FR
const mdCriteres = MarkdownIt({
    replaceLink: function (link, env) {
        if (!link.match(/^#test-|#crit-|https?:\/\//)) {
            return 'https://accessibilite.public.lu/fr/rgaa4/glossaire.html'+link
        }
        return link
    }
}).use(require('markdown-it-replace-link'))

function renderToFile(data,  file, pages) {
    ejs.renderFile('./tpl/main.ejs', {data: data, pages: pages}, function(err, str){
        if (err !== null) {
            console.log(err)
        }
        fs.writeFileSync(file, str)
    });
}

function genReport(data, pages) {

    ejs.renderFile('./tpl/criteria.ejs',{topics: criteres.topics, errors: data, md: mdCriteres, shortList: config.shortList}, function(err, str) {
        if (err !== null) {
            console.log(err)
        }
        renderToFile(str,  "audit.html", pages)
    })
}

exports = module.exports = genReport;
exports.default = genReport;