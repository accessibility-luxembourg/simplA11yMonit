import importlib.util
import os
import sys
from pathlib import Path

_dir = Path(__file__).parent

# Title used for pages whose WAF/captcha challenge could not be cleared.
_WAF_BLOCKED_TITLE = 'FIXME: page bloquée, impossible de récupérer le titre'

# Default location of the (optional, external) Captcha solver.
_DEFAULT_CAPTCHA_SOLVER = '../captcha_solver/captcha.py'


def _load_captcha_solver():
    """Dynamically load the Captcha solver from a configurable path.

    The path comes from the `CAPTCHA_SOLVER_PATH` environment variable (relative
    paths are resolved against the repo root). Returns the (has_captcha,
    solve_captcha) functions, or (None, None) when the file is
    unavailable so callers can skip captcha handling entirely.
    """
    raw = os.environ.get('CAPTCHA_SOLVER_PATH', _DEFAULT_CAPTCHA_SOLVER)
    path = Path(raw)
    if not path.is_absolute():
        path = (_dir.parent / path).resolve()

    if not path.is_file():
        print(f'Captcha solver not found at {path}; captcha handling disabled.',
              file=sys.stderr)
        return None, None

    try:
        spec = importlib.util.spec_from_file_location('captcha', str(path))
        if spec is None or spec.loader is None:
            raise ImportError(f'cannot create import spec for {path}')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module.has_captcha, module.solve_captcha
    except Exception as e:
        print(f'Failed to load captcha solver from {path}: {e}; '
              f'captcha handling disabled.', file=sys.stderr)
        return None, None


has_captcha, solve_captcha = _load_captcha_solver()


def get_pages():
    pages = [arg.strip() for arg in sys.argv[1:] if arg.strip()]
    if len(pages) != 3:
        print(f'Error: 3 URLs are needed as parameters', file=sys.stderr)
        print(f'Parameters received: {pages}', file=sys.stderr)
        sys.exit(1)
    return pages


def _check_page(browser, page_url, checks):
    """Load a page once and run the title detection plus every check against
    that single navigation.

    Returns (title, errors, blocked). When the page is gated by a WAF (detected
    via a Captcha widget) the solver attempts to clear it; if that
    fails the page is not tested and ``blocked`` is True. On a load failure, an
    empty title and no errors are returned (the page is still considered tested,
    as before).
    """

    # some websites ask for geolocation permission on load, and the prompt can block the audit indefinitely,
    # so we grant it upfront to let the audit proceed
    ctx = browser.new_context(geolocation={ 'longitude': 6.130026, 'latitude': 49.609625 },permissions=['geolocation'])
    page = ctx.new_page()
    try:
        page.goto(page_url, wait_until='load', timeout=100000)
        # Best-effort wait for the network to settle: some checks (e.g. the
        # precondition element counting) are more reliable once lazily-loaded
        # content has arrived. A page that never goes idle is still audited.
        try:
            page.wait_for_load_state('networkidle', timeout=30000)
        except Exception:
            pass

        # WAF detection: a Captcha widget means the page is gated.
        # Let the browser perform the work to clear it; only if
        # the challenge is still present afterwards do we treat it as blocked.
        # Skipped entirely when no captcha solver is configured/available.
        if has_captcha and solve_captcha and has_captcha(page):
            solve_captcha(page)
            if has_captcha(page):
                return page.title(), [], True

        title = page.title()

        errors = []
        for check in checks:
            errors.extend(check(page, page_url))
        return title, errors, False
    except Exception as e:
        print(f'Error loading {page_url}: {e}', file=sys.stderr)
        return '', [], False
    finally:
        ctx.close()


def _run(checks, reporting, lang):
    from playwright.sync_api import sync_playwright

    pages = get_pages()
    titles = []
    pages_to_test = []
    all_errors = []

    try:
        # A single browser is launched and reused for every page. Each page is
        # loaded only once and all tests (title detection, WAF/captcha handling,
        # axe, preconditions) run against that single navigation.
        # results seem more reliable when headless=False, possibly due to
        # differences in resource loading or timing
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=False)
            try:
                for page_url in pages:
                    title, errors, blocked = _check_page(browser, page_url, checks)
                    titles.append(_WAF_BLOCKED_TITLE if blocked else title)
                    if not blocked:
                        pages_to_test.append(page_url)
                        all_errors.extend(errors)
            finally:
                browser.close()

        reporting(all_errors, pages, pages_to_test, titles, lang)
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)


def run_tests(checks, reporting, lang):
    _run(checks, reporting, lang)
