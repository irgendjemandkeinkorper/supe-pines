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
    page.on("console", lambda msg: print(f"{prefix}BROWSER: {msg.text}"))


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
    page.get_by_role("button", name="Begin the Scene").click()
    assert page.locator(".scene-tracker").count() == 1
    assert page.locator(".scene-slot").count() == 3
    assert page.locator(".scene-slot.occupied").count() == 1
    page.fill("#scene-happened", "The heroes follow the Signal to the next roof.")
    page.locator("#scr-scene button.blood").click()
    page.wait_for_selector("#scr-resolve.active")
    assert page.locator(".scene-tracker.resolving").count() == 1

    # Double-click and pending state protection tests
    # First test generic withPendingState behavior
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

    # Assert disabled state and pending text are set on the button
    assert page.locator("#test-pending-btn").get_attribute("disabled") is not None
    assert page.locator("#test-pending-btn").inner_text() == "Pending State..."

    # Wait for the action to complete and verify restoration
    page.wait_for_timeout(1050)
    assert page.locator("#test-pending-btn").get_attribute("disabled") is None
    assert page.locator("#test-pending-btn").inner_text() == "Original Text"
    assert page.evaluate("window.actionCalls") == 1 # Action called only once

    # Test failure case preserves control and enables it
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

    # Now let's test Play Online Create/Join button specifically
    # Go to Play Online entry screen
    page.goto(BASE, wait_until="networkidle")
    page.get_by_role("button", name="Play Online").click()
    page.wait_for_selector("#scr-online-entry.active")

    page.evaluate('''() => {
        window.createRoomCalls = 0;
        window.onlineCreateRoom = async function(btn) {
            await window.withPendingState(btn, "Creating Room...", async () => {
                window.createRoomCalls++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
        };
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
    calls = page.evaluate("window.createRoomCalls")
    print(f"DEBUG: createRoomCalls is {calls}")
    assert calls == 1

    # Now let's do the same for Join Room button!
    page.evaluate('''() => {
        window.joinRoomCalls = 0;
        window.onlineJoinRoom = async function(btn) {
            await window.withPendingState(btn, "Joining...", async () => {
                window.joinRoomCalls++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            });
        };
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
