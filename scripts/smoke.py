#!/usr/bin/env python3
"""Dependency-only browser smoke coverage for the static Supe Pines build."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import sys

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1] if len(sys.argv) > 1 else None
server = None
errors = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def watch(page, prefix=""):
    page.on("pageerror", lambda error: errors.append(f"{prefix}pageerror: {error}"))
    page.on(
        "console",
        lambda message: errors.append(f"{prefix}console error: {message.text}")
        if message.type == "error" and "Failed to load resource" not in message.text
        else None,
    )


def run_dom_audit(page, stage_name):
    errs = page.evaluate('''() => {
        const controls = Array.from(document.querySelectorAll('input, select, textarea'));
        const activeScreen = document.querySelector('.screen.active');
        const activeScreenId = activeScreen ? activeScreen.id : null;

        const failures = [];
        const seenIds = new Set();

        controls.forEach(ctrl => {
            if (ctrl.type === 'hidden') return;

            // Check if control is inside the active screen
            const ctrlScreen = ctrl.closest('.screen');
            const isActive = ctrlScreen === activeScreen;

            // Check dynamic ID uniqueness in the active screen
            if (ctrl.id && isActive) {
                if (seenIds.has(ctrl.id)) {
                    failures.push(`Duplicate ID found on active screen #${activeScreenId}: #${ctrl.id}`);
                }
                seenIds.add(ctrl.id);
            }

            // Check for accessible label
            const hasAria = ctrl.getAttribute('aria-label') || ctrl.getAttribute('aria-labelledby');
            const isNestedInLabel = !!ctrl.closest('label');
            let hasLabelFor = false;
            if (ctrl.id) {
                const label = document.querySelector(`label[for="${ctrl.id}"]`);
                if (label) {
                    hasLabelFor = true;
                }
            }

            if (!hasAria && !isNestedInLabel && !hasLabelFor) {
                const screenId = ctrlScreen ? ctrlScreen.id : 'unknown';
                failures.push(`Control is missing an accessible label: <${ctrl.tagName.toLowerCase()} id="${ctrl.id || ''}" type="${ctrl.type || ''}"> on screen #${screenId}`);
            }
        });

        return failures;
    }''')
    if errs:
        raise AssertionError(f"DOM Audit failed at stage '{stage_name}':\\n" + "\\n".join(errs))


if BASE is None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    BASE = f"http://127.0.0.1:{server.server_port}/"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    watch(page)
    page.goto(BASE, wait_until="networkidle")
    assert page.title() == "Supe Pines — A Street-Level Case File"
    assert page.locator(".screen.active").get_attribute("id") == "scr-title"
    run_dom_audit(page, "title screen")
    assert page.locator("#title-online-button").count() == 1
    online_btn_text = page.locator("#title-online-button").inner_text().strip()
    assert "Online" in online_btn_text or "Play Online" in online_btn_text
    assert page.locator("#resume-local-button").is_hidden()

    page.get_by_role("button", name="Open the Case (this screen)").click()
    page.wait_for_selector("#scr-hook.active")
    run_dom_audit(page, "case select screen")
    assert page.locator(".casecard").count() == 8
    assert page.locator(".case-phase-rail").count() == 1
    assert page.locator(".casecard-art img").count() >= 4
    page.wait_for_function(
        """() => [...document.querySelectorAll('.casecard-art img')]
        .slice(0, 4)
        .every(img => img.complete && img.naturalWidth > 0)""",
        timeout=10_000,
    )

    page.locator(".casecard").first.click()
    run_dom_audit(page, "players screen")
    assert page.locator("input[name='local-art-style'][value='ink']").count() == 1
    assert page.locator("input[name='local-art-style'][value='expressionist']").count() == 1
    # The radio inputs are intentionally visually hidden behind their full-card
    # labels, so click the visible style choice rather than the hidden input.
    page.locator("label.art-style-option").filter(has_text="Interpretive Expressionist").click()
    assert page.locator("input[name='local-art-style'][value='expressionist']").is_checked()
    page.select_option("#pl-count", "1")
    run_dom_audit(page, "players screen with solo count")
    page.fill("#pl-name-0", "Smoke Tester")
    page.get_by_role("button", name="Suit Up").click()
    page.get_by_role("button", name="So It Begins").click()
    for index in range(6):
        run_dom_audit(page, f"hero setup index {index}")
        page.fill("#arch-name", f"Hero {index + 1}")
        page.fill("#arch-answer", f"Established fact {index + 1}")
        page.locator("#scr-archsetup button.primary").click()
    run_dom_audit(page, "threat screen")
    page.fill("#victim-name", "The Smoke Test")
    page.get_by_role("button", name="Deal the Cards").click()
    page.wait_for_selector("#scr-hub.active")
    run_dom_audit(page, "act hub screen")
    assert "ACT THE FIRST" in page.locator("#tb-act").inner_text().upper()
    assert page.evaluate("Boolean(localStorage.getItem('sp:save:v1'))")

    # Reload recovery is opt-in from the title screen.
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-hub.active")
    run_dom_audit(page, "resumed act hub screen")

    # Gallery: Hero faces remain separate and both visual languages are exposed.
    page.get_by_role("button", name="The Gallery").click()
    page.wait_for_selector("#overlay", state="visible")
    run_dom_audit(page, "gallery overlay")
    assert page.locator(".gcat-heroes .gtile").count() == 12
    assert page.locator(".gcat-cases .gtile").count() == 0
    tile = page.locator(".gcat-heroes .gtile").first
    control = tile.locator(".gallery-flip-control")
    assert control.get_attribute("aria-label") == "View Side II"
    control.click()
    assert control.get_attribute("aria-pressed") == "true"
    assert tile.locator("[data-gallery-side-label]").inner_text() == "Side II — turned"
    assert page.get_by_role("button", name="Noir Comic").count() == 1
    assert page.get_by_role("button", name="Interpretive Expressionist").count() == 1
    page.get_by_role("button", name="Interpretive Expressionist").click()
    assert page.locator(".gcat-heroes .gtile").count() == 12
    page.get_by_role("button", name="Noir Comic").click()
    page.get_by_role("button", name="Back to Millhaven").click()

    # The in-progress Dossier is readable and does not throw before Act I.
    page.get_by_role("button", name="The Dossier").click()
    page.wait_for_selector("#scr-chronicle.active")
    run_dom_audit(page, "dossier screen")
    page.get_by_role("button", name="Return to the Case").click()

    # Complete the first scene path and verify the tracker/resolution surfaces.
    page.get_by_role("button", name="Begin a scene").click()
    if page.get_by_role("button", name="Got it — begin").count():
        page.get_by_role("button", name="Got it — begin").click()
    run_dom_audit(page, "scene pick screen")
    page.locator("[id^='scene-pick-']").first.click()
    page.locator("#arch-pick-0").click()
    page.fill("#scene-opening", "Rain stripes the roof while the scanner hisses.")
    page.get_by_role("button", name="Begin the Scene").click()
    assert page.locator(".scene-tracker").count() == 1
    assert page.locator(".scene-slot").count() == 3
    assert page.locator(".scene-slot.occupied").count() == 1
    run_dom_audit(page, "scene play screen")
    page.fill("#scene-happened", "The heroes follow the Signal to the next roof.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    run_dom_audit(page, "resolve screen")
    assert page.locator(".scene-tracker.resolving").count() == 1

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    watch(mobile, "mobile ")
    mobile.goto(BASE, wait_until="networkidle")
    mobile.get_by_role("button", name="Open the Case (this screen)").click()
    assert mobile.locator(".casecard").count() == 8
    assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    mobile.close()
    browser.close()

if server:
    server.shutdown()
if errors:
    raise SystemExit("\n".join(errors))
print("Browser smoke test passed: eight Cases, resume, Gallery flip, Dossier, first scene, resolution, online entry, and mobile layout.")
