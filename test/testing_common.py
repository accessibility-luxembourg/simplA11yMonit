import asyncio
import sys

import requests
from bs4 import BeautifulSoup


def get_pages():
    pages = [arg.strip() for arg in sys.argv[1:] if arg.strip()]
    if len(pages) != 3:
        print(f'Error: 3 URLs are needed as parameters', file=sys.stderr)
        print(f'Parameters received: {pages}', file=sys.stderr)
        sys.exit(1)
    return pages


def get_title(page_url):
    try:
        resp = requests.get(page_url, timeout=30, headers={'User-Agent': 'Mozilla/5.0'})
        soup = BeautifulSoup(resp.content, 'html.parser', from_encoding=resp.apparent_encoding)
        title = soup.find('title')
        return title.get_text(strip=True) if title else ''
    except Exception:
        return ''


def get_titles(pages):
    return [get_title(p) for p in pages]


async def _check_pages(pages, check_func, pw):
    errors = []
    for page_url in pages:
        result = await check_func(page_url, pw)
        errors.extend(result)
    return errors


async def _run_async(checks, reporting, lang):
    from playwright.async_api import async_playwright

    pages = get_pages()
    titles = get_titles(pages)

    try:
        async with async_playwright() as pw:
            all_errors = []
            for check in checks:
                errors = await _check_pages(pages, check, pw)
                all_errors.extend(errors)

        reporting(all_errors, pages, titles, lang)
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)


def run_tests(checks, reporting, lang):
    asyncio.run(_run_async(checks, reporting, lang))
