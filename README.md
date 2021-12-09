# simplA11yMonit

simplA11yMonit is a tool supporting the simplified accessibility monitoring method as described in the [commission implementing decision EU 2018/1524](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018D1524&from=EN). It is used by [SIP (Information and Press Service)](https://sip.gouvernement.lu/en.html) in Luxembourg to monitor the websites of public sector bodies.
This tool executes automated accessibility tests based on [axe-core](https://github.com/dequelabs/axe-core), validates the markup of the pages with the [W3C NU html checker](https://validator.w3.org/nu/). The tool also check some preconditions, for example if no `iframe` is present in the page, the criteria related to `iframes` will be automatically non-applicable. 
simplA11yMonit generates a report, pre-filled with the results of the tests. This document can then be used for the manual testing step. The report is based on a shortlist of criteria coming from the [Luxembourgish version of the RGAA v4](https://accessibilite.public.lu/fr/rgaa4.1/criteres.html).
Most of the [accessibility reports](https://data.public.lu/fr/datasets/audits-simplifies-de-laccessibilite-numerique-2020-2021/) published by SIP on [data.public.lu](https://data.public.lu) have been generated using simplA11yMonit and simplA11yGenReport.

## Installation

```
git clone --recursive https://github.com/accessibility-luxembourg/simplA11yMonit.git
cd simplA11yMonit
npm install
```

This software is based on [selenium-webdriver](https://www.selenium.dev/documentation/en/webdriver/). The tests will be run in your browser. By default, this software is configured to execute the tests in Firefox. You need to install [GeckoDriver](https://github.com/mozilla/geckodriver/releases) and of course Firefox.

## Usage

1. Start GeckoDriver and Firefox
2. Select a few pages and run the script as follows:

```
./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```
3. The report is available in out/example.com.xlsx. This report can be opened in Excel for example for finalizing the audit.

The script runall.sh is available to test multiple websites. It is currently only compatible with Windows. To use it, create a file containing on each line a list of URLs to be tested. For example:

```
https://example.com/page1 https://example.com/page2 https://example.com/page3
https://sip.gouvernement.lu/en.html https://sip.gouvernement.lu/en/actualites.html https://sip.gouvernement.lu/en/dossiers.htm
```
When this file has been created, it is possible to generate all outputfiles with the following command:

```
./runall.sh
```

## Configuration
To configure the script you can use environment variables or a .env file.

### Language
We currently can generate reports in english and french. To change the language, just set the LANGUAGE variable to "fr" or "en". By default the language is set to french.

### Pages behind login
If the pages you want to assess are behind login, you can setup the following environment variables to pass the login step.

- LOGIN_PAGE: the URL where to log in
- LOGIN_USERNAME: your username
- LOGIN_USERNAME_SELECTOR: the css selector of the username input field
- LOGIN_PASSWORD: your password
- LOGIN_PASSWORD_SELECTOR: the css selector of the password input field
- LOGIN_BUTTON_SELECTOR: the css selector of the login form submit button

Example:

```
LOGIN_PAGE="https://www.example.com/login"
LOGIN_USERNAME="username"
LOGIN_USERNAME_SELECTOR='input[name="username"]'
LOGIN_PASSWORD="password"
LOGIN_PASSWORD_SELECTOR='input[name="password"]'
LOGIN_BUTTON_SELECTOR='.connection input'
```

## License
This software is (c) Information and press service of the luxembourgish government and licensed under the MIT license.
