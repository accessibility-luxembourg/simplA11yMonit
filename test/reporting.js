const fs = require('fs')
const ejs = require('ejs')
const MarkdownIt = require('markdown-it')


const shortList = ['1.2', '3.1', '4.10', '4.11', '4.12', '7.3', '9.1', '9.2', '10.7', '10.14', '11.1', '11.2', '11.10', '12.8', '12.9', '12.11', '13.7']
const criteres = JSON.parse(fs.readFileSync('../RGAA/criteres.json'))

// generate criteria in FR
const mdCriteres = MarkdownIt({
    replaceLink: function (link, env) {
        if (!link.match(/^#test-|#crit-|https?:\/\//)) {
            return 'glossaire.html'+link
        }
        return link
    }
}).use(require('markdown-it-replace-link'))

function renderToFile(data,  file) {
    ejs.renderFile('./tpl/main.ejs', {data: data}, function(err, str){
        if (err !== null) {
            console.log(err)
        }
        fs.writeFileSync(file, str)
    });
}

function genReport(data) {

    ejs.renderFile('./tpl/criteria.ejs',{topics: criteres.topics, errors: data, md: mdCriteres, shortList: shortList}, function(err, str) {
        if (err !== null) {
            console.log(err)
        }
        renderToFile(str,  "audit.html")
    })
}

exports = module.exports = genReport;
exports.default = genReport;