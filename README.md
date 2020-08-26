# simplA11yMonit

simplA11yMonit is a tool supporting the simplified accessibility monitoring method for Luxembourg.
It executes automated accessibility tests (mainly based on aXe), and generates a report, pre-filled with the results of the tests. This document can then be used for the manual testing step.

## Usage

```
./run.sh https://example.com/page1 https://example.com/page2 https://example.com/page3
```

## Installation

```
git clone --recursive https://github.com/accessibility-luxembourg/simplA11yMonit.git
cd simplA11yMonit
npm install
```

This software is based on [selenium-webdriver](https://www.selenium.dev/documentation/en/webdriver/). The tests will be run in your browser. So you need to install a component enabling the tests to be run in your browser. Currently, we have only tested this software with [ChromeDriver](https://chromedriver.chromium.org/downloads) 

## Configuration
To configure the script you can use environment variables or a .env file.

### Language

### Pages behind login
If the pages you want to assess are behind login, you can setup the following variables to pass the login step.

```
LOGIN_PAGE="https://www.example.com/login"
LOGIN_USERNAME="username"
LOGIN_USERNAME_SELECTOR='input[name="username"]'
LOGIN_PASSWORD="password"
LOGIN_PASSWORD_SELECTOR='input[name="password"]'
LOGIN_BUTTON_SELECTOR='.connection input'
```

## license
This software is (c) Information and Press Service and licensed under the MIT license.
