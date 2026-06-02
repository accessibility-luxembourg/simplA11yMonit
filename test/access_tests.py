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
        e['rgaa'] = rgaa
        result.append(e)
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


def check_with_axe(page, page_url):
    if not _AXE_JS.exists():
        print(f'Error: axe-core not found at {_AXE_JS}', file=sys.stderr)
        print('Run: npm install', file=sys.stderr)
        sys.exit(1)

    try:
        page.add_script_tag(path=str(_AXE_JS))

        if _lang == 'fr':
            page.evaluate('(locale) => axe.configure({locale: locale})', _axe_fr_strings)

        axe_result = page.evaluate("axe.run()")
    except Exception as e:
        print(f'Error running axe on {page_url}: {e}', file=sys.stderr)
        return []

    return _analyse_axe(page_url, axe_result)


def check_preconditions(page, page_url):
    # Maps element types to RGAA criteria that are N/A when the element is absent
    _mapping = {
        'img':      ['1.1', '1.2', '1.3', '1.6', '1.7'],
        'iframe':   ['2.1'],
        'table':    ['5.6', '5.7'],
        'formElts': ['11.1', '11.2','11.5', '11.6', '11.7', '11.9', '11.10'],
    }
    results = []

    try:
        # Compute all counts in a single, atomic page evaluation to avoid
        # observing transient DOM states between separate calls.
        counters = page.evaluate(
            (_dir / 'preconditions_analysis.js').read_text(encoding='utf-8')
        )
    except Exception as e:
        print(f'Error checking preconditions on {page_url}: {e}', file=sys.stderr)
        return []

    for precond, criteria in _mapping.items():
        if counters.get(precond, 1) == 0:
            for crit in criteria:
                results.append({'rgaa': crit, 'url': page_url, 'status': 'na'})

    return results


run_tests([check_with_axe, check_preconditions], gen_report, _lang)
