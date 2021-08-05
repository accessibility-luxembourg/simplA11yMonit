const fs = require('fs')
const path = require('path')
const ejs = require('ejs')
const config = require('..'+path.sep+'config.json')
const {encode} = require('html-entities')
const cheerio = require('cheerio')




// genReport: generates a report, based on the criteria.ejs template
function genReport(errors, pages, titles, i18n) {
    let tpl = fs.readFileSync("."+path.sep+"static"+path.sep+"template-grille-audit-simplifie"+path.sep+"xl"+path.sep+"sharedStrings.xml").toString()
    const outFile = "."+path.sep+"tmp"+path.sep+"template-grille-audit-simplifie"+path.sep+"xl"+path.sep+"sharedStrings.xml"
    const worksheetPath = "."+path.sep+"tmp"+path.sep+"template-grille-audit-simplifie"+path.sep+"xl"+path.sep+"worksheets"+path.sep
    const worksheetFiles = ['sheet7.xml', 'sheet8.xml', 'sheet9.xml']
    const statusCodes = {'c': '76', 'nc': '77', 'na': '78'}
    const statusOrder = {'c': 0, 'na': 1, 'nc': 2}
    const lang = i18n.getLocale()

    const worksheets = []
    for (let i=0; i<3; i++) {
        worksheets[i] = cheerio.load(fs.readFileSync(worksheetPath+worksheetFiles[i]), {xml: {normalizeWhitespace: true}})
    }

    //console.log(JSON.stringify(errors, null, 4)) 

    const todayStr = new Date().toLocaleDateString(lang, {year: 'numeric', month: 'long', day: 'numeric' })
    tpl = tpl.replace('date_audit', todayStr) 

    const urlSite = pages[0].replace('http://','').replace('https://','').split(/[/?#]/)[0]
    tpl = tpl.replace('url_site', urlSite)


    // manage the case where we can have multiple errors for the same page and the same criteria
    const msgs = {}
    const status = {}
    pages.forEach(p => {
        const pageId = pages.indexOf(p) + 1
        msgs[pageId] = {}
        status[pageId-1] = {} 
        errors.forEach(error => {
            if (error.url == p) {
                if (config.automatedCriteria.includes(error.rgaa) && (error.status != 'na')) {
                    const msg = ejs.render(fs.readFileSync('.'+path.sep+'tpl'+path.sep+'issue.ejs').toString(),{error: error, i18n: i18n})
                    if (msgs[pageId][error.rgaa] === undefined) {
                        msgs[pageId][error.rgaa] = msg
                    } else {
                        msgs[pageId][error.rgaa] += "\n\n"+msg
                    }     
                }
                if (error.status) {
                    if (status[pageId-1][error.rgaa] !== undefined) {
                        // 'nc'> 'na' > 'c'
                        if (statusOrder[status[pageId-1][error.rgaa]] < statusOrder[error.status]){
                            status[pageId-1][error.rgaa] = error.status  
                        }
                    } else {
                        status[pageId-1][error.rgaa] = error.status
                    }
                }   
            }
        })
        // we can say when fully automated criteria are valid
        config.fullyAutomatedCriteria.forEach(crit => {
            if (status[pageId-1][crit] === undefined && msgs[pageId][crit] === undefined) {
                status[pageId-1][crit] = 'c'
            }
        })
    })
    //console.log(status)

    // generate worksheets
    pages.forEach(p => {
        const pageId = pages.indexOf(p)
        Object.keys(status[pageId]).forEach(crit => {
            const critIdx = config.allCriteria.indexOf(crit) + 4
            //console.log(`c[r="D${critIdx}"] > v`, worksheets[pageId](`c[r="D${critIdx}"] > v`).text(), statusCodes[status[pageId][crit]])
            
            worksheets[pageId](`c[r="D${critIdx}"] > v`).text(statusCodes[status[pageId][crit]])
        })
    })

    // generate sharedStrings
    pages.forEach(page => {
        let emptyCrits = JSON.parse(JSON.stringify(config.allCriteria))
        const pageId = pages.indexOf(page) + 1
        tpl = tpl.replace(`url_page_${pageId}`, page)
        tpl = tpl.replace(`titre_page_${pageId}`, encode(titles[pageId -1]))
        errors.forEach(error => {
            if (config.automatedCriteria.includes(error.rgaa) && error.url == page) {
                emptyCrits = emptyCrits.filter(e => e != error.rgaa)
                tpl = tpl.replace(`<t>Modif_${pageId}_${error.rgaa}</t>`, msgs[pageId][error.rgaa])         
            }
        })
        emptyCrits.forEach(crit => {
            tpl = tpl.replace(`Modif_${pageId}_${crit}`, '')
        })
        fs.writeFileSync(outFile, tpl)
    })
    for (let i=0; i<3; i++) {
        fs.writeFileSync(worksheetPath+worksheetFiles[i], worksheets[i].xml())
    }

}

exports = module.exports = genReport;
exports.default = genReport;