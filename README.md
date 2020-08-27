# simplA11yMonit

simplA11yMonit is a tool supporting the simplified accessibility monitoring method for Luxembourg.
It executes automated accessibility tests (mainly based on aXe), and generates a report, pre-filled with the results of the tests. This document can then be used for the manual testing step. The report is based on a shortlist of criteria coming from the Luxembourgish version of the RGAA v4.

## Installation

```
git clone --recursive https://github.com/accessibility-luxembourg/simplA11yMonit.git
cd simplA11yMonit
npm install
```

This software is based on [selenium-webdriver](https://www.selenium.dev/documentation/en/webdriver/). The tests will be run in your browser. So you need to install a component enabling the tests to be run in your browser. Currently, we have only tested this software with [ChromeDriver](https://chromedriver.chromium.org/downloads) 

## Usage

1. Start chromedriver or any other driver for selenium webdriver
2. Select a few pages and run the script as follows:

```
./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```
3. The report is available in out/audit.html. This report can be opened in MS Word for example for finalizing the audit.

## Configuration
To configure the script you can use environment variables or a .env file.

### Language
We currently can generate reports in english and french. To change the language, just set the LANGUAGE variable to "fr" or "en". By default the language is set to french.

### Viewer
You can set the VIEWER setting to the software of your choice. For example on Windows "start winword" will automatically open the report in MS Word at the end of the tests.

### Pages behind login
If the pages you want to assess are behind login, you can setup the following variables to pass the login step.

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

## license
This software is (c) Information and press service of the luxembourgish government and licensed under the MIT license.
