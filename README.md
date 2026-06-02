# simplA11yMonit

simplA11yMonit is a tool supporting the simplified accessibility monitoring method as described in the [commission implementing decision EU 2018/1524](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018D1524&from=EN). It is used by [SIP (Information and Press Service)](https://sip.gouvernement.lu/en.html) in Luxembourg to monitor the websites of public sector bodies.

This tool executes automated accessibility tests based on [axe-core](https://github.com/dequelabs/axe-core) using [Playwright](https://playwright.dev/python/). It also checks preconditions: for example, if no `iframe` is present in the page, criteria related to iframes will be automatically marked non-applicable.

simplA11yMonit generates a spreadsheet, pre-filled with the results of the automated tests. This document can then be used for the manual testing step. The report is based on a shortlist of criteria from the [Luxembourgish version of the RGAA v4](https://accessibilite.public.lu/fr/rgaa4.1/criteres.html).

Most of the [accessibility reports](https://data.public.lu/fr/datasets/audits-simplifies-de-laccessibilite-numerique-2020-2021/) published by SIP on [data.public.lu](https://data.public.lu) have been generated using simplA11yMonit and [simplA11yGenReport](https://github.com/accessibility-luxembourg/simplA11yGenReport).

## Requirements

- Python 3.8+
- Node.js and npm (only used to provide the axe-core JavaScript bundle)

## Installation

```bash
git clone --recursive https://github.com/accessibility-luxembourg/simplA11yMonit.git
cd simplA11yMonit
python -m venv ./env/
source ./env/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
npm install
```

## Usage

Select three pages from the site you want to audit and run:

```bash
./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```

The spreadsheet is saved to `out/example.com.xlsx`. Open it in Excel or LibreOffice Calc to complete the manual testing step.

If the output file for a site already exists, the script will skip that site and exit cleanly.

### Batch auditing

To audit multiple sites, create a file (e.g. `audits-src.txt`) with one set of three URLs per line:

```
https://example.com/page1 https://example.com/page2 https://example.com/page3
https://sip.gouvernement.lu/en.html https://sip.gouvernement.lu/en/actualites.html https://sip.gouvernement.lu/en/dossiers.htm
```

Then run:

```bash
./runall.sh
```

## Configuration

### Language

Reports can be generated in French or English. Set the `LANGUAGE` environment variable to `fr` or `en`. The default is French.

```bash
LANGUAGE=en ./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```

### Captcha solver (optional)

Some pages are gated behind a captcha challenge. When a page is loaded, simplA11yMonit detects such a challenge and lets the browser perform the required work to clear it, so the real page can be audited. If the challenge cannot be cleared, the page is skipped and flagged in the report.

The solver itself lives in a separate, optional module that is loaded dynamically. Its location is set with the `CAPTCHA_SOLVER_PATH` environment variable (default: `../captcha_solver/captcha.py`):

```bash
CAPTCHA_SOLVER_PATH=/path/to/captcha.py ./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```

Relative paths are resolved against the repository root. **This module is entirely optional**: if the file is not present (or fails to load), captcha handling is silently disabled and pages are audited as-is. A notice is printed to stderr in that case.

## License

This software is (c) [Information and press service](https://sip.gouvernement.lu/en.html) of the luxembourgish government and licensed under the MIT license.
