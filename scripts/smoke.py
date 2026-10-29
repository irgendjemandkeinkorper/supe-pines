#!/usr/bin/env python3
"""Dependency-only browser smoke coverage for the static Supe Pines build."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import argparse
import re

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument(
    "--engine",
    choices=("chromium", "webkit", "firefox"),
    default="chromium",
    help="Playwright browser engine to launch (default: chromium)",
)
parser.add_argument(
    "base",
    nargs="?",
    help="Optional already-running Supe Pines URL; otherwise a local server is started",
)
args = parser.parse_args()
BASE = args.base
server = None
errors = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


# WebKit surfaces the Firebase SDK's blocked Firestore WebChannel XHRs
# (no real project is reachable from CI) as page errors; Chromium only logs
# them. They come from the SDK's own transport, not app code, so ignore
# exactly that shape and keep every other page error fatal.
EXTERNAL_NETWORK_NOISE = ("firestore.googleapis.com/google.firestore.v1.Firestore/", "due to access control checks")


def record_page_error(prefix, error):
    text = str(error)
    if all(marker in text for marker in EXTERNAL_NETWORK_NOISE):
        print(f"{prefix}ignored external network error: {text[:120]}")
        return
    errors.append(f"{prefix}pageerror: {text}")


def watch(page, prefix=""):
    page.on("pageerror", lambda error: record_page_error(prefix, error))
    page.on("console", lambda msg: print(f"{prefix}BROWSER: {msg.text}"))


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
    assert_controls_named(page, stage_name)


def check_no_raw_undefined_or_null(page):
    text = page.locator("body").inner_text()
    assert not re.search(r'\bundefined\b', text, re.I), f"Found raw 'undefined' text on page! text:\n{text}"
    assert not re.search(r'\bnull\b', text, re.I), f"Found raw 'null' text on page! text:\n{text}"


def play_one_scene(page, arch_idx):
    # Click Begin a scene
    page.get_by_role("button", name="Begin a scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    # Select the first scene card and the lead Hero
    page.locator("[id^='scene-pick-']").first.click()
    page.locator(f"#arch-pick-{arch_idx}").click()
    page.fill("#scene-opening", f"Scene starting for Hero {arch_idx + 1}.")
    page.get_by_role("button", name="Begin the Scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    # Play/narrate the scene
    page.fill("#scene-happened", f"Something dramatic happened for Hero {arch_idx + 1}.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)

    # Click Count the Tones (without turning hero)
    page.get_by_role("button", name="Count the Tones").click()



def assert_screen_focus(page, screen_id):
    """After a screen change, focus lands inside the new screen, never in a
    hidden one (#67)."""
    page.wait_for_function(
        """id => {
            const el = document.activeElement;
            return el && el !== document.body && el.closest('.screen')?.id === id;
        }""",
        arg=screen_id,
        timeout=5_000,
    )
    assert page.evaluate("!document.activeElement.closest('.screen:not(.active)')")


def assert_controls_named(page, stage_name):
    """Every visible button / role=button has an accessible name and is not
    hidden behind opacity until hover (#40)."""
    problems = page.evaluate("""() => {
        const roots = [document.querySelector('.screen.active'), document.getElementById('topbar')];
        const overlay = document.getElementById('overlay');
        if (overlay && overlay.style.display === 'block') roots.push(overlay);
        const out = [];
        for (const root of roots.filter(Boolean)) {
            for (const el of root.querySelectorAll('button, [role="button"]')) {
                if (!el.offsetParent) continue;
                const name = (el.getAttribute('aria-label') || el.textContent || el.title || '').trim();
                if (!name) out.push(el.outerHTML.slice(0, 100));
                const opacity = parseFloat(getComputedStyle(el).opacity);
                const entering = el.getAnimations().some(a => a.playState === 'running');
                if (opacity < 0.3 && !el.disabled && !entering) out.push('near-invisible: ' + el.outerHTML.slice(0, 100));
            }
        }
        return out;
    }""")
    assert not problems, f"{stage_name}: unnamed or hidden controls: {problems}"


LAYOUT_PROBE = """() => {
    const vw = window.innerWidth;
    const out = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls horizontally: ${document.documentElement.scrollWidth} > ${vw}`);
    const roots = [document.querySelector('.screen.active'), document.getElementById('topbar')];
    for (const root of roots.filter(Boolean)) {
        for (const el of root.querySelectorAll('button, [role="button"], input, select, textarea')) {
            if (!el.offsetParent || el.closest('.sr-only')) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            const label = (el.getAttribute('aria-label') || el.textContent || el.id || el.tagName).trim().slice(0, 40);
            if (r.left < -1 || r.right > vw + 1) out.push(`clipped: ${label} (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
            if (Math.min(r.width, r.height) < 24 && el.type !== 'radio' && el.type !== 'checkbox') out.push(`small target: ${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
    }
    return out;
}"""


def check_layout(page, stage):
    problems = page.evaluate(LAYOUT_PROBE)
    assert not problems, f"{stage} @ {page.viewport_size['width']}px: {problems}"


def check_core_flow_layout(browser, width, reduced_motion="no-preference"):
    """Core flow at one width (#68). 320 CSS px is also the WCAG reflow
    equivalent of a 1280px window at 400% zoom, so that run doubles as the
    zoom check. With reduced motion, nothing on screen may be mid-animation
    and selection must still read as text."""
    context = browser.new_context(viewport={"width": width, "height": 800}, has_touch=width < 700, reduced_motion=reduced_motion)
    p = context.new_page()
    watch(p, f"{width}px ")
    p.goto(BASE, wait_until="load")
    stage = lambda name: (check_layout(p, name), run_dom_audit(p, f"{name} @ {width}px"))
    stage("title")
    p.get_by_role("button", name="Open the Case (this screen)").click()
    stage("case picker")
    p.locator(".casecard").first.click()
    p.select_option("#pl-count", "2")
    p.fill("#pl-name-0", "Ada")
    p.fill("#pl-name-1", "Bo")
    stage("players")
    p.get_by_role("button", name="Suit Up").click()
    p.get_by_role("button", name="So It Begins").click()
    for index in range(6):
        if index == 0:
            stage("hero setup")
        p.fill("#arch-name", f"Hero {index + 1}")
        p.fill("#arch-answer", f"Fact {index + 1}")
        p.locator("#scr-archsetup button.primary").click()
    stage("threat")
    p.fill("#victim-name", "Layout Threat")
    p.get_by_role("button", name="Deal the Cards").click()
    p.wait_for_selector("#scr-hub.active")
    stage("hub")
    p.get_by_role("button", name="Begin a scene").first.click()
    if p.get_by_role("button", name="Got it — begin").count():
        p.get_by_role("button", name="Got it — begin").click()
    p.locator("[id^='scene-pick-']").first.click()
    stage("scene pick")
    if reduced_motion == "reduce":
        # Colour/border fades are fine; anything that moves, scales, or fades
        # content in and out is motion.
        running = p.evaluate("""document.getAnimations()
            .filter(a => a.playState === 'running' && a.effect?.getComputedTiming().duration > 0.01)
            .map(a => ({name: a.animationName || a.transitionProperty, el: a.effect.target?.className || ''}))
            .filter(a => /^(transform|opacity|filter|translate|scale|rotate|top|left|right|bottom|margin.*)$|^[a-zA-Z]+(In|Deal|Pulse|Callout)$/.test(a.name))""")
        assert not running, f"reduced motion still animating: {running}"
        cue = p.evaluate("getComputedStyle(document.querySelector('.card.selected'), '::before').content")
        assert "Selected" in cue, f"selected card lacks a text cue under reduced motion: {cue}"
    p.locator("#arch-pick-0").click()
    p.fill("#scene-opening", "Narrow screen opening.")
    p.get_by_role("button", name="Begin the Scene").click()
    p.wait_for_selector("#scr-scene.active")
    stage("scene play")
    p.get_by_role("button", name="The Dossier", exact=True).click()
    p.wait_for_selector("#scr-chronicle.active")
    stage("dossier")
    context.close()


def focus_in_overlay(page):
    return page.evaluate("document.getElementById('overlay').contains(document.activeElement)")


def check_overlay_keyboard(page, open_overlay, expected_label, opener=None):
    """Overlay is a named modal dialog: focus enters, Tab/Shift+Tab stay
    inside, Escape closes it and returns focus to the opener (#13)."""
    if opener is not None:
        opener.focus()
        opener.press("Enter")
    else:
        open_overlay()
    page.wait_for_selector("#overlay", state="visible")
    label = page.locator("#overlay").get_attribute("aria-label")
    assert label == expected_label, f"overlay label {label!r} != {expected_label!r}"
    assert page.locator("#overlay").get_attribute("role") == "dialog"
    assert focus_in_overlay(page), f"{expected_label}: focus did not move into the overlay"
    count = page.evaluate("document.querySelectorAll('#overlay button, #overlay a[href], #overlay textarea, #overlay [tabindex=\"0\"]').length")
    for key in ["Tab"] * (count + 2) + ["Shift+Tab"] * (count + 2):
        page.keyboard.press(key)
        assert focus_in_overlay(page), f"{expected_label}: {key} escaped the dialog"
    assert page.evaluate("document.querySelector('.wrap').inert && document.getElementById('topbar').inert")
    page.keyboard.press("Escape")
    page.wait_for_selector("#overlay", state="hidden")
    if opener is not None:
        assert opener.evaluate("el => el === document.activeElement"), f"{expected_label}: focus not returned to opener"


if BASE is None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    BASE = f"http://127.0.0.1:{server.server_port}/"


with sync_playwright() as playwright:
    browser = getattr(playwright, args.engine).launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    watch(page)
    page.goto(BASE, wait_until="load")
    assert page.title() == "Supe Pines — A Street-Level Case File"
    assert page.locator(".screen.active").get_attribute("id") == "scr-title"
    run_dom_audit(page, "title screen")
    assert page.locator("#title-online-button").count() == 1

    # Wait for the background Firebase readiness check to complete (and
    # fail/degrade, since no real Firebase project is reachable from CI/this
    # sandbox) before asserting on its resulting button text. This used to
    # rely on `page.goto(..., wait_until="networkidle")` incidentally giving
    # the background fetch enough time to finish; that's fragile across
    # browser engines (WebKit's networkidle heuristics differ from
    # Chromium's and could hang past the smoke-test timeout on this app's
    # background sync traffic), so wait for the actual condition instead.
    page.wait_for_function(
        "() => document.getElementById('title-online-button').textContent.startsWith('Online')"
    )
    assert page.locator("#title-online-button").inner_text().startswith("Online")
    assert page.locator("#resume-local-button").is_hidden()

    # Click Play Online to see the connection issue troubleshoot screen
    page.locator("#title-online-button").click()
    page.wait_for_selector("#scr-online-entry.active")
    page.wait_for_function("""() => {
        const entry = document.getElementById('scr-online-entry');
        return entry && (
            entry.innerText.includes('SWITCHBOARD OFFLINE') ||
            entry.querySelector('#oe-host-name') ||
            entry.innerText.includes('Switchboard Isn’t Live Yet')
        );
    }""")
    if page.locator("text=SWITCHBOARD OFFLINE").count():
        assert page.locator("text=The Firebase Release Checklist").count() == 1
        assert page.get_by_role("button", name="Retry Connection").count() == 1
        assert page.get_by_role("button", name="Play Hotseat (Open the Case)").count() == 1
        assert page.get_by_role("button", name="Back").count() == 1
        assert page.locator("#scr-online-entry [data-ui-state='error'][role='alert']").count() == 1
    else:
        assert page.locator("#oe-host-name").count() == 1
    # UI states (#41), online flow: loading -> error, each with a way out.
    page.evaluate("import('./js/ui/online/index.js').then(m => m.renderOnlineVerificationLoading())")
    page.wait_for_selector("#scr-online-entry [data-ui-state='loading'][aria-busy='true']")
    assert page.locator("#scr-online-entry").get_by_role("button", name="Cancel").count() == 1
    page.evaluate("import('./js/ui/online/index.js').then(m => m.renderOnlineVerificationFailed(new Error('network timeout')))")
    page.wait_for_selector("#scr-online-entry [data-ui-state='error']")
    assert "Network Offline" in page.locator("#scr-online-entry").inner_text()
    assert page.get_by_role("button", name="Retry Connection").count() == 1

    # Click Back to return to title screen
    page.get_by_role("button", name="Back").click()
    page.wait_for_selector("#scr-title.active")

    # Keyboard-only start: Enter on the title button lands focus on the
    # Case picker heading, and the live status region exists.
    page.get_by_role("button", name="Open the Case (this screen)").focus()
    page.keyboard.press("Enter")
    page.wait_for_selector("#scr-hook.active")
    assert_screen_focus(page, "scr-hook")
    assert page.evaluate("document.activeElement.textContent.trim()") == "Choose the Case"
    assert page.locator("#sr-status[role='status'][aria-live='polite']").count() == 1
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
    assert_screen_focus(page, "scr-players")
    run_dom_audit(page, "players screen")
    assert page.locator("input[name='local-art-style'][value='ink']").count() == 1
    assert page.locator("input[name='local-art-style'][value='expressionist']").count() == 1
    # The radio inputs are intentionally visually hidden behind their full-card
    # labels, so click the visible style choice rather than the hidden input.
    page.locator("#pl-art-style label.art-style-option").filter(has_text="Church Glass").click()
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
    page.reload(wait_until="load")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-hub.active")
    run_dom_audit(page, "resumed act hub screen")

    # Every overlay entry point is a keyboard-safe, named dialog (#13).
    check_overlay_keyboard(page, None, "How the Case Is Run", page.locator("#topbar").get_by_role("button", name="The Rules"))
    check_overlay_keyboard(page, None, "The Gallery", page.locator("#topbar").get_by_role("button", name="The Gallery"))
    check_overlay_keyboard(page, None, "Stakeout", page.locator("#topbar").get_by_role("button", name="Stakeout"))
    inspect = page.locator("#scr-hub .card-inspect").first
    card_name = inspect.get_attribute("aria-label").removeprefix("Read ").removesuffix(" card larger")
    check_overlay_keyboard(page, None, f"Card detail: {card_name}", inspect)
    page.locator("#topbar").get_by_role("button", name="The Gallery").click()
    page.locator(".gtile").first.focus()
    page.keyboard.press("Enter")
    detail_label = page.locator("#overlay").get_attribute("aria-label")
    assert detail_label.startswith("Gallery detail: "), detail_label
    assert focus_in_overlay(page), "gallery detail re-render dropped focus out of the dialog"
    page.keyboard.press("Escape")
    page.wait_for_selector("#overlay", state="hidden")
    check_overlay_keyboard(page, lambda: page.evaluate("import('./js/chronicle/markdown.js').then(m => m.fallbackCopy('# Dossier'))"), "Copy the Dossier")
    # History-driven close (browser Back) also returns focus to the opener (#67).
    rules_button = page.locator("#topbar").get_by_role("button", name="The Rules")
    rules_button.focus()
    rules_button.press("Enter")
    page.wait_for_selector("#overlay", state="visible")
    page.go_back()
    page.wait_for_selector("#overlay", state="hidden")
    assert rules_button.evaluate("el => el === document.activeElement"), "Back did not return focus to the Rules button"

    # Gallery: Hero faces remain separate and both visual languages are exposed.
    page.get_by_role("button", name="The Gallery").click()
    page.wait_for_selector("#overlay", state="visible")
    run_dom_audit(page, "gallery overlay")
    assert page.locator(".gcat-heroes .gtile").count() == 15
    assert page.locator(".gcat-cases .gtile").count() == 0
    tile = page.locator(".gcat-heroes .gtile").first
    control = tile.locator(".gallery-flip-control")
    assert control.get_attribute("aria-label") == "View Bad Day"
    control.click()
    assert control.get_attribute("aria-pressed") == "true"
    assert tile.locator("[data-gallery-side-label]").inner_text() == "Bad Day"
    assert page.get_by_role("button", name="Bold Comic").count() == 1
    assert page.get_by_role("button", name="Church Glass").count() == 1
    page.get_by_role("button", name="Church Glass").click()
    assert page.locator(".gcat-heroes .gtile").count() == 15
    page.get_by_role("button", name="Bold Comic").click()
    page.get_by_role("button", name="Back to Millhaven").click()

    # The in-progress Dossier is readable and does not throw before Act I.
    # exact=True: the milestone-rail row's aria-label ("Open the Dossier")
    # otherwise substring-matches this same accessible name too.
    page.get_by_role("button", name="The Dossier", exact=True).click()
    page.wait_for_selector("#scr-chronicle.active")
    assert_screen_focus(page, "scr-chronicle")
    run_dom_audit(page, "dossier screen")
    # UI states (#41), Dossier: empty before any scene is played.
    assert page.locator("#scr-chronicle [data-ui-state='empty']").count() == 1
    page.get_by_role("button", name="Return to the Case").click()

    # Play Scene 1 of Act I and verify the tracker/resolution surfaces.
    page.get_by_role("button", name="Begin a scene").click()
    if page.get_by_role("button", name="Got it — begin").count():
        page.get_by_role("button", name="Got it — begin").click()
    assert_screen_focus(page, "scr-scene")
    run_dom_audit(page, "scene pick screen")
    check_no_raw_undefined_or_null(page)

    page.locator("[id^='scene-pick-']").first.click()
    page.locator("#arch-pick-0").click()
    page.fill("#scene-opening", "Rain stripes the roof while the scanner hisses.")

    # 1. Reload/Resume on Scene-Pick screen
    page.reload(wait_until="load")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-scene.active")
    assert "selected" in page.locator("[id^='scene-pick-']").first.get_attribute("class")
    assert "selected" in page.locator("#arch-pick-0").get_attribute("class")
    assert page.locator("#scene-opening").input_value() == "Rain stripes the roof while the scanner hisses."
    assert page.locator("#btn-begin").is_enabled()

    page.get_by_role("button", name="Begin the Scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    assert page.locator(".scene-tracker").count() == 1
    assert page.locator(".scene-slot").count() == 3
    assert page.locator(".scene-slot.occupied").count() == 1
    run_dom_audit(page, "scene play screen")

    page.fill("#scene-happened", "The heroes follow the Signal to the next roof.")
    page.get_by_role("button", name="plays a card into this scene").first.click()
    page.locator("[id^='scene-pick-']").first.click()
    page.fill("#contrib-how", "Suddenly, a shadow falls across the street.")

    # 2. Reload/Resume on Scene-Play screen (with pending contribution & happened text)
    page.reload(wait_until="load")
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-scene.active")
    assert page.locator("#scene-happened").input_value() == "The heroes follow the Signal to the next roof."
    assert page.locator("#contrib-how").input_value() == "Suddenly, a shadow falls across the street."

    page.get_by_role("button", name="Play It").click()
    assert page.locator(".scene-slot.occupied").count() == 2

    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    run_dom_audit(page, "resolve screen")
    check_no_raw_undefined_or_null(page)
    assert page.locator(".scene-tracker.resolving").count() == 1

    # Exercise resume coverage in a second page while this page remains on
    # the original resolution screen for the full three-act smoke path.
    resume_snapshot = page.evaluate("localStorage.getItem('sp:save:v1')")
    assert resume_snapshot
    resume_page = browser.new_page(viewport={"width": 1440, "height": 1000})
    watch(resume_page, "resume ")
    resume_page.goto(BASE, wait_until="load")
    if resume_page.get_by_role("button", name="Resume saved Case").count() == 0:
        resume_page.evaluate(
            "(snapshot) => localStorage.setItem('sp:save:v1', snapshot)",
            resume_snapshot,
        )
        resume_page.reload(wait_until="load")
    resume_page.get_by_role("button", name="Resume saved Case").click()
    resume_page.wait_for_selector("#scr-resolve.active")
    resume_page.locator("#flip-0").check()

    # 3. Reload/Resume on Resolution screen (verifying flip checkbox state)
    resume_page.reload(wait_until="load")
    resume_page.get_by_role("button", name="Resume saved Case").click()
    resume_page.wait_for_selector("#scr-resolve.active")
    assert resume_page.locator("#flip-0").is_checked()

    # Force the player's first secret combo to match the scene tones so a secret is guaranteed to unlock.
    resume_page.evaluate("""() => {
        const G = window.State.G;
        const c = G.current;
        const lead = G.heroes[c.archIdx];
        const isFlipped = document.getElementById('flip-' + c.archIdx).checked ? !lead.flipped : lead.flipped;
        const s = lead.sides[isFlipped ? 1 : 0];
        const tones = [c.card.tone];
        c.contributions.forEach(x => { if (x.kind === 'scene') tones.push(x.card.tone); });
        tones.push(s.tone);
        G.players[0].secrets[0].combo = tones.slice(0, 3);
        G.players[0].secrets[0].used = false;
    }""")

    resume_page.get_by_role("button", name="Count the Tones").click()
    resume_page.wait_for_selector("#scr-secret.active")

    # Pick 3 signals and write the vignette answer
    resume_page.locator("#omen-pick-0").click()
    resume_page.locator("#omen-pick-1").click()
    resume_page.locator("#omen-pick-2").click()
    resume_page.fill("#secret-answer", "The shadows knew the truth all along.")

    # 4. Reload/Resume on Secret reveal screen
    resume_page.reload(wait_until="load")
    assert resume_page.get_by_role("button", name="Resume saved Case").is_visible()
    resume_page.get_by_role("button", name="Resume saved Case").click()
    resume_page.wait_for_selector("#scr-secret.active")
    assert "selected" in resume_page.locator("#omen-pick-0").get_attribute("class")
    assert "selected" in resume_page.locator("#omen-pick-1").get_attribute("class")
    assert "selected" in resume_page.locator("#omen-pick-2").get_attribute("class")
    assert resume_page.locator("#secret-answer").input_value() == "The shadows knew the truth all along."
    assert resume_page.locator("#btn-secret").is_enabled()

    # Verify no undefined or null output exists on the resumed screens
    visible_text = resume_page.locator("body").inner_text().lower()
    assert "undefined" not in visible_text
    assert "null" not in visible_text

    resume_page.get_by_role("button", name="So It Is Revealed").click()
    resume_page.wait_for_selector("#scr-hub.active")

    # 5. Verify online room state is never copied into localStorage.
    resume_page.goto(BASE, wait_until="load")
    resume_page.locator("#title-online-button").click()
    resume_page.wait_for_selector("#scr-online-entry.active")
    resume_page.evaluate("window.State.onlineRoomCode = 'XYZ123'")
    resume_page.evaluate("window.saveGame('scr-online-entry')")
    save_data = resume_page.evaluate("localStorage.getItem('sp:save:v1')")
    if save_data:
        import json
        snap = json.loads(save_data)
        assert snap.get("screen") != "scr-online-entry"
    resume_page.close()
    # Check flip-0 to turn the first Hero
    page.locator("#flip-0").check()

    # Programmatically align our first secret's combo to match the exact 3 resolved active tones
    # We do this here on scr-resolve so we can query the check state of flip-0 and get the correct final face-up tones!
    page.evaluate("""() => {
        const G = window.State.G;
        const c = G.current;

        const willFlip = [];
        G.heroes.forEach((a, i) => {
            const cb = document.getElementById('flip-' + i);
            if (cb && cb.checked) {
                willFlip.push(i);
            }
        });

        const lead = G.heroes[c.archIdx];
        const finalFlipped = willFlip.includes(c.archIdx) ? !lead.flipped : lead.flipped;
        const leadTone = lead.sides[finalFlipped ? 1 : 0].tone;

        const tones = [];
        if (c.card.tone) tones.push(c.card.tone);
        c.contributions.forEach(x => { if (x.kind === 'scene') tones.push(x.card.tone); });
        tones.push(leadTone);

        G.players[0].secrets[0].combo = tones;
    }""")

    page.get_by_role("button", name="Count the Tones").click()

    # Buried Secret triggered!
    page.wait_for_selector("#scr-secret.active")
    check_no_raw_undefined_or_null(page)
    assert "A BURIED SECRET" in page.locator("#scr-secret").inner_text().upper()

    # Select 3 signals to answer the secret
    page.locator("#omen-pick-0").click()
    page.locator("#omen-pick-1").click()
    page.locator("#omen-pick-2").click()
    page.fill("#secret-answer", "The secret is that the light was never on.")
    page.locator("#btn-secret").click()

    # Back on the hub, Scene 1 completed
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act I Scene 2
    play_one_scene(page, 1)
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act I Scene 3
    page.get_by_role("button", name="Begin a scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    page.locator("[id^='scene-pick-']").first.click()
    page.locator("#arch-pick-2").click()
    page.fill("#scene-opening", "Third scene opens.")
    page.get_by_role("button", name="Begin the Scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    page.fill("#scene-happened", "Third scene happens.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)

    # Force tied tones for the Act Close in G.discardTones
    page.evaluate("""() => {
      const G = window.State.G;
      const c = G.current;
      const lead = G.heroes[c.archIdx];
      const tones = [];
      if(c.card.tone) tones.push(c.card.tone);
      c.contributions.forEach(x=>{ if(x.kind==='scene') tones.push(x.card.tone); });
      tones.push(lead.sides[lead.flipped?1:0].tone);

      const finalCounts = { Fury: 0, Guilt: 0, Dread: 0 };
      G.heroes.forEach(h => {
        const tone = h.sides[h.flipped ? 1 : 0].tone;
        finalCounts[tone]++;
      });
      tones.forEach(t => finalCounts[t]++);

      G.discardTones = [];
      const target = 12;
      for (let i = finalCounts.Fury; i < target; i++) G.discardTones.push('Fury');
      for (let i = finalCounts.Guilt; i < target; i++) G.discardTones.push('Guilt');
    }""")

    page.get_by_role("button", name="Count the Tones").click()

    # Tied Act Close
    page.wait_for_selector("#scr-close.active")
    check_no_raw_undefined_or_null(page)
    assert "THE TONES STAND TIED" in page.locator("#scr-close").inner_text().upper()

    # Select the last tied-tone option (Guilt option)
    page.locator("input[name='close-el']").last.click()

    page.fill("#close-opening", "The Act Close camera rises over the smoggy skyline.")
    page.get_by_role("button", name="Play the Act Close").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    # Resolve close scene
    page.fill("#scene-happened", "The close reaches its dramatic conclusion.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)

    page.get_by_role("button", name="Count the Tones").click()

    # Transition to Act II
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)
    assert "ACT THE SECOND" in page.locator("#tb-act").inner_text().upper()

    # Act II Scene 1
    play_one_scene(page, 3)
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act II Scene 2
    play_one_scene(page, 4)
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act II Scene 3
    play_one_scene(page, 5)
    page.wait_for_selector("#scr-close.active")
    check_no_raw_undefined_or_null(page)

    # Act II Close
    page.fill("#close-opening", "Act II Close starts.")
    page.get_by_role("button", name="Play the Act Close").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    page.fill("#scene-happened", "Act II Close ends.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)

    page.get_by_role("button", name="Count the Tones").click()

    # Transition to Act III
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)
    assert "ACT THE THIRD" in page.locator("#tb-act").inner_text().upper()

    # Act III Scene 1
    play_one_scene(page, 0)
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act III Scene 2
    play_one_scene(page, 1)
    page.wait_for_selector("#scr-hub.active")
    check_no_raw_undefined_or_null(page)

    # Act III Scene 3
    play_one_scene(page, 2)
    page.wait_for_selector("#scr-close.active")
    check_no_raw_undefined_or_null(page)

    # Act III Close
    page.fill("#close-opening", "Act III Close starts.")
    page.get_by_role("button", name="Play the Act Close").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    page.fill("#scene-happened", "Act III Close ends.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)

    page.get_by_role("button", name="Count the Tones").click()

    # We should now be on the Final Dossier screen!
    page.wait_for_selector("#scr-chronicle.active")
    check_no_raw_undefined_or_null(page)
    assert "THE CASE IS CLOSED" in page.locator("#scr-chronicle").inner_text().upper()
    assert page.locator("#scr-chronicle [data-ui-state='empty']").count() == 0, "filled Dossier still shows the empty state"
    assert "THE MILLHAVEN DOSSIER" in page.locator("#scr-chronicle").inner_text().upper()
    assert "DEBRIEF QUESTIONS" in page.locator("#scr-chronicle").inner_text().upper()

    # Test Strike behavior
    strike_btn = page.locator(".chron-entry button.ghost").first
    assert "strike" in strike_btn.inner_text().lower()
    strike_btn.click()
    assert "restore" in strike_btn.inner_text().lower()
    assert "struck" in page.locator(".chron-entry").first.get_attribute("class")

    # Restore again
    strike_btn.click()
    assert "strike" in strike_btn.inner_text().lower()
    assert "struck" not in page.locator(".chron-entry").first.get_attribute("class")

    # Double-click and pending state protection tests
    page.evaluate('''() => {
        const btn = document.createElement("button");
        btn.id = "test-pending-btn";
        btn.textContent = "Original Text";
        document.body.appendChild(btn);

        window.actionCalls = 0;
        window.testAction = async () => {
            window.actionCalls++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        };

        btn.onclick = () => window.withPendingState(btn, "Pending State...", window.testAction);
    }''')

    # Rapid click from JS context to avoid Playwright overhead latency
    page.evaluate('''() => {
        const btn = document.getElementById("test-pending-btn");
        btn.click();
        btn.click();
    }''')
    assert page.locator("#test-pending-btn").get_attribute("disabled") is not None
    assert page.locator("#test-pending-btn").inner_text() == "Pending State..."
    page.wait_for_timeout(1050)
    assert page.locator("#test-pending-btn").get_attribute("disabled") is None
    assert page.locator("#test-pending-btn").inner_text() == "Original Text"
    assert page.evaluate("window.actionCalls") == 1

    # Failure must also restore the control for a later retry.
    page.evaluate('''() => {
        const btn = document.getElementById("test-pending-btn");
        window.failActionCalls = 0;
        window.testFailAction = async () => {
            window.failActionCalls++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            throw new Error("Simulated failure");
        };
        btn.onclick = () => window.withPendingState(btn, "Failing...", window.testFailAction).catch(() => {});
    }''')
    page.locator("#test-pending-btn").click()
    assert page.locator("#test-pending-btn").get_attribute("disabled") is not None
    assert page.locator("#test-pending-btn").inner_text() == "Failing..."
    page.wait_for_timeout(1050)
    assert page.locator("#test-pending-btn").get_attribute("disabled") is None
    assert page.locator("#test-pending-btn").inner_text() == "Original Text"
    assert page.evaluate("window.failActionCalls") == 1

    # Exercise the actual online entry button contract. If Firebase is
    # unavailable, provide the same minimal controls so the handler test can
    # still run without requiring external services.
    page.goto(BASE, wait_until="load")
    page.locator("#title-online-button").click()
    page.wait_for_selector("#scr-online-entry.active")
    if page.locator("#oe-host-name").count() == 0:
        page.evaluate('''() => {
            document.getElementById("scr-online-entry").innerHTML = `
                <input id="oe-case" value="0">
                <input id="oe-host-name">
                <input id="oe-join-code">
                <input id="oe-join-name">
                <button class="primary" onclick="onlineCreateRoom(this)">Open the Table</button>
                <button class="primary" onclick="onlineJoinRoom(this)">Join the Table</button>`;
        }''')

    page.evaluate('''() => {
        window.createRoomCalls = 0;
        window.onlineCreateRoom = async function(btn) {
            await window.withPendingState(btn, "Creating Room...", async () => {
                window.createRoomCalls++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
        };
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Open the Table"));
        btn.onclick = () => window.onlineCreateRoom(btn);
    }''')
    page.fill("#oe-host-name", "Double Click Tester")
    page.evaluate('''() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Open the Table"));
        btn.click();
        btn.click();
    }''')
    assert page.locator("button:has-text('Creating Room...')").count() == 1
    assert page.locator("button:has-text('Creating Room...')").get_attribute("disabled") is not None
    page.wait_for_timeout(1050)
    assert page.evaluate("window.createRoomCalls") == 1

    page.evaluate('''() => {
        window.joinRoomCalls = 0;
        window.onlineJoinRoom = async function(btn) {
            await window.withPendingState(btn, "Joining...", async () => {
                window.joinRoomCalls++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
        };
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Join the Table"));
        btn.onclick = () => window.onlineJoinRoom(btn);
    }''')
    page.fill("#oe-join-code", "K7QRM")
    page.fill("#oe-join-name", "Double Click Joiner")
    page.evaluate('''() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Join the Table"));
        btn.click();
        btn.click();
    }''')
    assert page.locator("button:has-text('Joining...')").count() == 1
    assert page.locator("button:has-text('Joining...')").get_attribute("disabled") is not None
    page.wait_for_timeout(1050)
    assert page.evaluate("window.joinRoomCalls") == 1

    for width in (320, 375, 1280):
        check_core_flow_layout(browser, width)
    check_core_flow_layout(browser, 375, reduced_motion="reduce")

    mobile_context = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True)
    mobile = mobile_context.new_page()
    watch(mobile, "mobile ")
    mobile.goto(BASE, wait_until="load")
    # UI states (#41), setup and Gallery: when art fails to load, the
    # fallback still names the card.
    mobile.route("**/art/images/**/cases/**", lambda route: route.fulfill(status=404, body=""))
    mobile.route("**/art/images/**/heroes/**", lambda route: route.fulfill(status=404, body=""))
    # Touch: card actions are visible and tappable without hover (#40).
    mobile.locator("#scr-title").get_by_role("button", name="The Gallery").tap()
    mobile.wait_for_selector("#overlay", state="visible")
    mobile.wait_for_selector(".gtile-media.g-missing, .gallery-face.g-missing")
    assert mobile.locator(".gtile").first.locator(".gf-title").first.inner_text().strip() != ""
    flip = mobile.locator(".gallery-flip-control").first
    assert flip.is_visible() and float(flip.evaluate("el => getComputedStyle(el).opacity")) > 0.5
    flip.tap()
    assert flip.get_attribute("aria-pressed") == "true"
    mobile.locator(".gtile").first.tap()
    assert mobile.locator("#overlay").get_attribute("aria-label").startswith("Gallery detail: ")
    mobile.keyboard.press("Escape")
    mobile.wait_for_selector("#overlay", state="hidden")
    mobile.get_by_role("button", name="Open the Case (this screen)").tap()
    assert mobile.locator(".casecard").count() == 8
    mobile.wait_for_selector(".casecard-art.missing")
    assert mobile.locator(".casecard-art.missing .game-art-fallback").first.inner_text().strip() != ""
    assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    mobile_context.close()
    browser.close()

if server:
    server.shutdown()
if errors:
    raise SystemExit("\n".join(errors))
print("Browser smoke test passed: complete local case over three acts, Buried Secret, tied Act Close, Hero turning, Strike behavior, and final Dossier.")
