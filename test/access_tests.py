import copy
import json
import os
import sys
from pathlib import Path

_dir = Path(__file__).parent
sys.path.insert(0, str(_dir))

from testing_common import run_tests
from reporting import gen_report

# Configuration
_lang = os.environ.get('LANGUAGE', 'fr')
_locales_dir = _dir.parent / 'node_modules' / 'axe-core' / 'locales'
_axe_fr_strings = json.loads((_locales_dir / 'fr.json').read_text(encoding='utf-8'))

_AXE_JS = _dir.parent / 'node_modules' / 'axe-core' / 'axe.min.js'

# Counts visible images that are not the sole child of a link
_NR_IMAGES_SCRIPT = """
() => {
    function isImageLink(e) {
        return e.parentNode.nodeName === 'A' &&
               e.nextElementSibling === null &&
               e.previousElementSibling === null;
    }
    return Array.from(document.querySelectorAll(
        'img, [role="img"], area, input[type="image"], svg, ' +
        'object[type="image"], embed[type="image"], canvas'
    ))
    .filter(e => !isImageLink(e))
    .filter(e => window.getComputedStyle(e).display !== 'none')
    .length;
}
"""

def get_rgaa_id(error):
    # Expect error.tags to be an iterable of tag strings
    tags = getattr(error, 'tags', None) or error.get('tags', None) if isinstance(error, dict) else None
    if not tags:
        return None

    if 'RGAAv4' in tags:
        ids = [t.replace('RGAA-', '') for t in tags if isinstance(t, str) and t.startswith('RGAA-')]
        if not ids:
            return None
        # normally there is only one Axe test mapped to an RGAA test
        first = ids[0]
        # as we get an RGAA test, we would like to get the corresponding criteria
        parts = first.split('.')
        return '.'.join(parts[:2]) if len(parts) >= 2 else first
    return None

def is_best_practice(error):
    tags = getattr(error, 'tags', None) or error.get('tags', None) if isinstance(error, dict) else None
    if not tags:
        return False
    return 'best-practice' in tags

def _tag_errors_axe(errors, url, confidence):
    result = []
    for error in errors:
        rgaa = get_rgaa_id(error)
        if rgaa is None or is_best_practice(error):
            continue
        e = dict(error)
        e['url'] = url
        e['confidence'] = confidence
        if isinstance(rgaa, str):
            e['rgaa'] = rgaa
            result.append(e)
        else:
            for crit in rgaa:
                item = copy.deepcopy(e)
                item['rgaa'] = crit
                result.append(item)
    return result


def _analyse_axe(page_url, result):
    violations = _tag_errors_axe(result.get('violations', []), page_url, 'violation')
    for r in violations:
        r['status'] = 'nc'
    incomplete = _tag_errors_axe(result.get('incomplete', []), page_url, 'needs review')
    # 3.2 (color contrast) "needs review" results are too noisy to be useful
    incomplete = [e for e in incomplete
                  if not (e['confidence'] == 'needs review' and e.get('rgaa') == '3.2')]
    return violations + incomplete


async def check_with_axe(page_url, pw):
    if not _AXE_JS.exists():
        print(f'Error: axe-core not found at {_AXE_JS}', file=sys.stderr)
        print('Run: npm install', file=sys.stderr)
        sys.exit(1)

    browser = await pw.chromium.launch(headless=False)
    ctx = await browser.new_context()
    page = await ctx.new_page()
    try:
        await page.goto(page_url, wait_until='load', timeout=60000)
        await page.add_script_tag(path=str(_AXE_JS))

        if _lang == 'fr':
            await page.evaluate('(locale) => axe.configure({locale: locale})', _axe_fr_strings)

        axe_result = await page.evaluate("axe.run()")
    except Exception as e:
        print(f'Error running axe on {page_url}: {e}', file=sys.stderr)
        return []
    finally:
        await ctx.close()
        await browser.close()

    return _analyse_axe(page_url, axe_result)


async def check_preconditions(page_url, pw):
    # Maps element types to RGAA criteria that are N/A when the element is absent
    _mapping = {
        'img':      ['1.1', '1.2', '1.3', '1.6', '1.7'],
        'iframe':   ['2.1'],
        'table':    ['5.6', '5.7'],
        'formElts': ['11.1', '11.2','11.5', '11.6', '11.7', '11.9', '11.10'],
    }
    results = []

    # results seem more reliable when headless=False, possibly due to differences in resource loading or timing
    browser = await pw.chromium.launch(headless=False)
    ctx = await browser.new_context()
    page = await ctx.new_page()
    try:
        await page.goto(page_url, wait_until='networkidle', timeout=60000)

        # Compute all counts in a single, atomic page evaluation to avoid
        # observing transient DOM states between separate calls.
        counters = await page.evaluate(
            (_dir / 'preconditions_analysis.js').read_text(encoding='utf-8')
        )
    except Exception as e:
        print(f'Error checking preconditions on {page_url}: {e}', file=sys.stderr)
        return []
    finally:
        await ctx.close()
        await browser.close()

    for precond, criteria in _mapping.items():
        if counters.get(precond, 1) == 0:
            for crit in criteria:
                results.append({'rgaa': crit, 'url': page_url, 'status': 'na'})

    return results


run_tests([check_with_axe, check_preconditions], gen_report, _lang)
