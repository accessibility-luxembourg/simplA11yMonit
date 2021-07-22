const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const config = require('..'+path.sep+'config.json')
const {encode} = require('html-entities')




// genReport: generates a report, based on the criteria.ejs template
function genReport(errors, pages, titles, i18n) {
    let tpl = fs.readFileSync("."+path.sep+"static"+path.sep+"template-grille-audit-simplifie"+path.sep+"xl"+path.sep+"sharedStrings.xml").toString()
    const outFile = "."+path.sep+"out"+path.sep+"template-grille-audit-simplifie"+path.sep+"xl"+path.sep+"sharedStrings.xml"
    const lang = i18n.getLocale()

    //console.log(JSON.stringify(errors, null, 4)) 

    const todayStr = new Date().toLocaleDateString(lang, {year: 'numeric', month: 'long', day: 'numeric' })
    tpl = tpl.replace('date_audit', todayStr) 

    const urlSite = pages[0].replace('http://','').replace('https://','').split(/[/?#]/)[0]
    tpl = tpl.replace('url_site', urlSite)

    pages.forEach(page => {
        let emptyCrits = JSON.parse(JSON.stringify(config.shortList))
        const pageId = pages.indexOf(page) + 1
        tpl = tpl.replace(`url_page_${pageId}`, page)
        tpl = tpl.replace(`titre_page_${pageId}`, encode(titles[pageId -1]))
        errors.forEach(error => {
            if (config.shortList.includes(error.rgaa) && error.url == page) {
                emptyCrits = emptyCrits.filter(e => e != error.rgaa)
                const msg = ejs.render(fs.readFileSync('.'+path.sep+'tpl'+path.sep+'issue.ejs').toString(),{error: error, i18n: i18n})
                tpl = tpl.replace(`<t>Modif_${pageId}_${error.rgaa}</t>`, msg)         
            }
        })
        emptyCrits.forEach(crit => {
            tpl = tpl.replace(`Modif_${pageId}_${crit}`, '')
        })
        fs.writeFileSync(outFile, tpl)
    })
}

exports = module.exports = genReport;
exports.default = genReport;