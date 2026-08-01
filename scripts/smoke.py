#!/usr/bin/env python3
"""Dependency-only browser smoke coverage for the static Supe Pines build."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import sys
import re

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
    assert page.locator("#title-online-button").count() == 1
    assert page.locator("#resume-local-button").is_hidden()

    # Wait for the background Firebase readiness check to complete (and fail/degrade)
    page.wait_for_function(
        "() => document.getElementById('title-online-button').textContent.includes('Online')"
    )

    # Click Play Online to see the connection issue troubleshoot screen
    page.locator("#title-online-button").click()
    page.wait_for_selector("#scr-online-entry.active")
    assert page.locator("text=SWITCHBOARD OFFLINE").count() == 1
    assert page.locator("text=The Firebase Release Checklist").count() == 1
    assert page.get_by_role("button", name="Retry Connection").count() == 1
    assert page.get_by_role("button", name="Play Hotseat (Open the Case)").count() == 1
    assert page.get_by_role("button", name="Back").count() == 1

    # Click Back to return to title screen
    page.get_by_role("button", name="Back").click()
    page.wait_for_selector("#scr-title.active")

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

    # Play Scene 1 of Act I and verify the tracker/resolution surfaces.
    page.get_by_role("button", name="Begin a scene").click()
    if page.get_by_role("button", name="Got it — begin").count():
        page.get_by_role("button", name="Got it — begin").click()
    check_no_raw_undefined_or_null(page)

    page.locator("[id^='scene-pick-']").first.click()
    page.locator("#arch-pick-0").click()
    page.fill("#scene-opening", "Rain stripes the roof while the scanner hisses.")
    page.get_by_role("button", name="Begin the Scene").click()
    page.wait_for_selector("#scr-scene.active")
    check_no_raw_undefined_or_null(page)

    assert page.locator(".scene-tracker").count() == 1
    assert page.locator(".scene-slot").count() == 3
    assert page.locator(".scene-slot.occupied").count() == 1

    # Buy-in with a scene card from hand to get exactly 3 tones in the scene
    page.get_by_role("button", name="Smoke Tester plays a card into this scene").click()
    page.wait_for_selector("[id^='scene-pick-']")
    page.locator("[id^='scene-pick-']").first.click()
    page.fill("#contrib-how", "A shadow stretches across the alley.")
    page.get_by_role("button", name="Play It").click()

    page.fill("#scene-happened", "The heroes follow the Signal to the next roof.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    check_no_raw_undefined_or_null(page)
    assert page.locator(".scene-tracker.resolving").count() == 1

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
print("Browser smoke test passed: complete local case over three acts, Buried Secret, tied Act Close, Hero turning, Strike behavior, and final Dossier.")
