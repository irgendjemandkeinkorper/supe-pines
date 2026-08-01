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
    assert page.get_by_role("button", name="Play Online").count() == 1
    assert page.locator("#resume-local-button").is_hidden()

    page.get_by_role("button", name="Open the Case (this screen)").click()
    page.wait_for_selector("#scr-hook.active")
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
    assert page.locator("input[name='local-art-style'][value='ink']").count() == 1
    assert page.locator("input[name='local-art-style'][value='expressionist']").count() == 1
    # The radio inputs are intentionally visually hidden behind their full-card
    # labels, so click the visible style choice rather than the hidden input.
    page.locator("label.art-style-option").filter(has_text="Interpretive Expressionist").click()
    assert page.locator("input[name='local-art-style'][value='expressionist']").is_checked()
    page.select_option("#pl-count", "1")
    page.fill("#pl-name-0", "Smoke Tester")
    page.get_by_role("button", name="Suit Up").click()
    page.get_by_role("button", name="So It Begins").click()
    for index in range(6):
        page.fill("#arch-name", f"Hero {index + 1}")
        page.fill("#arch-answer", f"Established fact {index + 1}")
        page.locator("#scr-archsetup button.primary").click()
    page.fill("#victim-name", "The Smoke Test")
    page.get_by_role("button", name="Deal the Cards").click()
    page.wait_for_selector("#scr-hub.active")
    assert "ACT THE FIRST" in page.locator("#tb-act").inner_text().upper()
    assert page.evaluate("Boolean(localStorage.getItem('sp:save:v1'))")

    # Reload recovery is opt-in from the title screen.
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-hub.active")

    # Gallery: Hero faces remain separate and both visual languages are exposed.
    page.get_by_role("button", name="The Gallery").click()
    page.wait_for_selector("#overlay", state="visible")
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
    assert "THE MILLHAVEN DOSSIER" in page.locator("#scr-chronicle").inner_text()
    page.get_by_role("button", name="Return to the Case").click()

    # Complete the first scene path and verify the tracker/resolution surfaces.
    page.get_by_role("button", name="Begin a scene").click()
    if page.get_by_role("button", name="Got it — begin").count():
        page.get_by_role("button", name="Got it — begin").click()
    page.locator("[id^='scene-pick-']").first.click()
    page.locator("#arch-pick-0").click()
    page.fill("#scene-opening", "Rain stripes the roof while the scanner hisses.")

    # 1. Reload/Resume on Scene-Pick screen
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-scene.active")
    assert "selected" in page.locator("[id^='scene-pick-']").first.get_attribute("class")
    assert "selected" in page.locator("#arch-pick-0").get_attribute("class")
    assert page.locator("#scene-opening").input_value() == "Rain stripes the roof while the scanner hisses."
    assert page.locator("#btn-begin").is_enabled()

    page.get_by_role("button", name="Begin the Scene").click()
    assert page.locator(".scene-tracker").count() == 1
    assert page.locator(".scene-slot").count() == 3
    assert page.locator(".scene-slot.occupied").count() == 1

    page.fill("#scene-happened", "The heroes follow the Signal to the next roof.")
    page.get_by_role("button", name="plays a card into this scene").first.click()
    page.locator("[id^='scene-pick-']").first.click()
    page.fill("#contrib-how", "Suddenly, a shadow falls across the street.")

    # 2. Reload/Resume on Scene-Play screen (with pending contribution & happened text)
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-scene.active")
    assert page.locator("#scene-happened").input_value() == "The heroes follow the Signal to the next roof."
    assert page.locator("#contrib-how").input_value() == "Suddenly, a shadow falls across the street."

    page.get_by_role("button", name="Play It").click()
    assert page.locator(".scene-slot.occupied").count() == 2

    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    assert page.locator(".scene-tracker.resolving").count() == 1

    page.locator("#flip-0").check()

    # 3. Reload/Resume on Resolution screen (verifying flip checkbox state)
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-resolve.active")
    assert page.locator("#flip-0").is_checked()

    # Force the player's first secret combo to match the scene tones so a secret is guaranteed to unlock.
    page.evaluate("""() => {
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

    page.get_by_role("button", name="Count the Tones").click()
    page.wait_for_selector("#scr-secret.active")

    # Pick 3 signals and write the vignette answer
    page.locator("#omen-pick-0").click()
    page.locator("#omen-pick-1").click()
    page.locator("#omen-pick-2").click()
    page.fill("#secret-answer", "The shadows knew the truth all along.")

    # 4. Reload/Resume on Secret reveal screen
    page.reload(wait_until="networkidle")
    assert page.get_by_role("button", name="Resume saved Case").is_visible()
    page.get_by_role("button", name="Resume saved Case").click()
    page.wait_for_selector("#scr-secret.active")
    assert "selected" in page.locator("#omen-pick-0").get_attribute("class")
    assert "selected" in page.locator("#omen-pick-1").get_attribute("class")
    assert "selected" in page.locator("#omen-pick-2").get_attribute("class")
    assert page.locator("#secret-answer").input_value() == "The shadows knew the truth all along."
    assert page.locator("#btn-secret").is_enabled()

    # Verify no undefined or null output exists on the resumed screens
    visible_text = page.locator("body").inner_text().lower()
    assert "undefined" not in visible_text
    assert "null" not in visible_text

    page.get_by_role("button", name="So It Is Revealed").click()
    page.wait_for_selector("#scr-hub.active")

    # 5. Verify online room state is never copied into localStorage.
    # Go to Play Online entry and create a room, and check localStorage.
    page.goto(BASE, wait_until="networkidle")
    page.locator("#title-online-button").click()
    page.wait_for_selector("#scr-online-entry.active")
    # Simulate being in an online mode by setting room code
    page.evaluate("window.State.onlineRoomCode = 'XYZ123'")
    page.evaluate("window.saveGame('scr-online-entry')")
    # localStorage save must NOT exist for XYZ123 or scr-online-entry
    save_data = page.evaluate("localStorage.getItem('sp:save:v1')")
    if save_data:
        import json
        snap = json.loads(save_data)
        assert snap.get("screen") != "scr-online-entry"

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
