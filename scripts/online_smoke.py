#!/usr/bin/env python3
"""Two-client online smoke test against the Firebase emulators (#10).

Run it inside the emulators so no real project is ever touched:

    npx firebase emulators:exec --only auth,firestore "python scripts/online_smoke.py"

The shipped game always talks to the production project. This test swaps
js/sync/firebase-init.js, in the browser only, for a copy that connects to
the local Auth and Firestore emulators under the reserved demo-supe-pines
project. No production code path or credential is involved, and the
emulator discards every room when it exits.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import argparse
import re

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--engine", choices=("chromium", "webkit", "firefox"), default="chromium")
parser.add_argument("--headed", action="store_true", help="Show both browser windows")
args = parser.parse_args()

AUTH_EMULATOR = "http://127.0.0.1:9099"
FIRESTORE_HOST, FIRESTORE_PORT = "127.0.0.1", 8080
errors = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def emulator_init_module():
    """firebase-init.js pointed at the emulators, pinned to the same SDK version."""
    real = (ROOT / "js/sync/firebase-init.js").read_text()
    version = re.search(r"firebasejs/([\d.]+)/firebase-app\.js", real).group(1)
    sdk = f"https://www.gstatic.com/firebasejs/{version}"
    return f"""
import {{ initializeApp }} from '{sdk}/firebase-app.js';
import {{ getAuth, connectAuthEmulator }} from '{sdk}/firebase-auth.js';
import {{ getFirestore, connectFirestoreEmulator }} from '{sdk}/firebase-firestore.js';
export const app = initializeApp({{
  apiKey: 'demo-key', authDomain: 'demo-supe-pines.firebaseapp.com',
  projectId: 'demo-supe-pines', appId: 'demo-app'
}});
export const auth = getAuth(app);
connectAuthEmulator(auth, '{AUTH_EMULATOR}', {{ disableWarnings: true }});
export const db = getFirestore(app);
connectFirestoreEmulator(db, '{FIRESTORE_HOST}', {FIRESTORE_PORT});
"""


INIT_MODULE = emulator_init_module()


def new_player(browser, label):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.route("**/js/sync/firebase-init.js", lambda route: route.fulfill(
        status=200, content_type="text/javascript", body=INIT_MODULE))
    # Skip the first-scene primer so both players go straight to the table.
    context.add_init_script("try { localStorage.setItem('sp:seenIntro', '1') } catch (e) {}")
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(f"{label} pageerror: {error}"))
    page.on("console", lambda msg: print(f"{label}: {msg.text}") if msg.type in ("error", "warning") else None)
    return context, page


def open_online_entry(page, base):
    page.goto(base, wait_until="load")
    page.locator("#title-online-button").click()
    page.wait_for_selector("#oe-join-code")


def active_screen(page):
    return page.evaluate("document.querySelector('.screen.active')?.id")


def wait_screen(page, screen_id, timeout=15000):
    page.wait_for_function("id => document.querySelector('.screen.active')?.id === id", arg=screen_id, timeout=timeout)


def read_doc(page, path):
    """Read a Firestore document as this player, through the app's own SDK instance."""
    return page.evaluate("""async path => {
        const { db } = await import('./js/sync/firebase-init.js');
        const sdk = await import(%r);
        try {
            const snap = await sdk.getDoc(sdk.doc(db, ...path.split('/')));
            return { ok: true, exists: snap.exists(), data: snap.exists() ? snap.data() : null };
        } catch (error) {
            return { ok: false, code: error.code || String(error) };
        }
    }""" % re.search(r"'(https://[^']+firebase-firestore\.js)'", INIT_MODULE).group(1), path)


def uid_of(page):
    return page.evaluate("async () => (await import('./js/sync/auth.js')).getUid()")


def main():
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}/"

    with sync_playwright() as p:
        browser = getattr(p, args.engine).launch(headless=not args.headed)
        host_ctx, host = new_player(browser, "host")
        guest_ctx, guest = new_player(browser, "guest")

        # 1. Connection loss and retry: the readiness check fails while the
        #    emulators are unreachable, then Retry Connection recovers.
        blocked = "**/127.0.0.1:{9099,8080}/**"
        host_ctx.route(blocked, lambda route: route.abort())
        host.goto(base, wait_until="load")
        host.locator("#title-online-button").click()
        host.wait_for_selector("#scr-online-entry [data-ui-state='error']", timeout=30000)
        assert host.get_by_role("button", name="Retry Connection").is_visible()
        host_ctx.unroute(blocked)
        host.get_by_role("button", name="Retry Connection").click()
        host.wait_for_selector("#oe-join-code", timeout=30000)
        print("ok: readiness failure shows the error state, and Retry Connection recovers")

        # 2. Host opens a room; guest joins with the code.
        host.fill("#oe-host-name", "Host Hal")
        host.locator("#oe-art-style-picker .art-style-option").first.click()
        host.get_by_role("button", name="Open the Table").click()
        wait_screen(host, "scr-online-lobby")
        code = re.search(r"room=([A-Z0-9]+)", host.url).group(1)

        open_online_entry(guest, base)
        guest.fill("#oe-join-code", code)
        guest.fill("#oe-join-name", "Guest Gia")
        guest.get_by_role("button", name="Join the Table").click()
        wait_screen(guest, "scr-online-lobby")
        for page in (host, guest):
            expect(page.locator("#scr-online-lobby")).to_contain_text("Seated (2 of 6)")
            expect(page.locator("#scr-online-lobby")).to_contain_text("Host Hal")
            expect(page.locator("#scr-online-lobby")).to_contain_text("Guest Gia")
        expect(guest.locator("#scr-online-lobby")).to_contain_text("Waiting for the host to begin")
        print(f"ok: host and guest share lobby {code}")

        # 3. Guest reloads from the room URL and is reseated, not duplicated.
        guest_uid = uid_of(guest)
        guest.goto(f"{base}?room={code}", wait_until="load")
        wait_screen(guest, "scr-online-lobby", timeout=30000)
        assert uid_of(guest) == guest_uid, "reload changed the anonymous uid"
        expect(guest.locator("#scr-online-lobby")).to_contain_text("Seated (2 of 6)")
        expect(host.locator("#scr-online-lobby")).to_contain_text("Seated (2 of 6)")
        print("ok: guest reconnects from the room URL in the same seat")

        # 4. Host begins; both follow every phase through Hero setup and the Threat.
        host.get_by_role("button", name="Open the Case").click()
        for page in (host, guest):
            wait_screen(page, "scr-archsetup")
        for question in range(6):
            answered = False
            for page in (host, guest):
                if page.locator("#arch-name").count():
                    page.fill("#arch-name", f"Hero {question + 1}")
                    page.fill("#arch-answer", f"Answer {question + 1}")
                    page.locator("#scr-archsetup button.primary").click()
                    answered = True
                    break
            assert answered, f"nobody could answer question {question + 1}"
            if question < 5:
                for page in (host, guest):
                    page.wait_for_function("n => document.querySelector('#scr-archsetup')?.textContent.includes(n)",
                                           arg=f"Question {['I','II','III','IV','V','VI'][question + 1]} of VI")
        for page in (host, guest):
            wait_screen(page, "scr-victim")
        host.fill("#victim-name", "The Smoke Test")
        host.get_by_role("button", name="Deal the Cards").click()
        for page in (host, guest):
            wait_screen(page, "scr-hub")
        print("ok: both clients follow lobby -> Hero setup -> Threat -> hub")

        # 5. Private hands: each player reads only their own private document.
        host_uid = uid_of(host)
        own = read_doc(guest, f"rooms/{code}/private/{guest_uid}")
        assert own["ok"] and own["exists"] and own["data"]["hand"], own
        other = read_doc(guest, f"rooms/{code}/private/{host_uid}")
        assert not other["ok"] and "permission-denied" in other["code"], other
        other = read_doc(host, f"rooms/{code}/private/{guest_uid}")
        assert not other["ok"] and "permission-denied" in other["code"], other
        room = read_doc(guest, f"rooms/{code}")["data"]
        assert all("hand" not in seat and "secrets" not in seat for seat in room["players"]), "room doc leaks private cards"
        print("ok: private hand and Secret documents are owner-only")

        # 6. One remote scene transition: host begins a scene, guest sees it live.
        host.get_by_role("button", name="Begin a scene").click()
        host.locator("[id^='scene-pick-']").first.click()
        host.locator("[id^='arch-pick-']").first.click()
        host.fill("#scene-opening", "Fog on the water tower.")
        host.locator("#btn-begin").click()
        for page in (host, guest):
            wait_screen(page, "scr-scene")
        expect(guest.locator("#scr-scene")).to_contain_text("Fog on the water tower.")
        expect(guest.locator("#sr-status")).to_contain_text("Host Hal is running a scene")
        print("ok: a scene begun by the host appears on the guest's screen")

        guest_ctx.close()
        host_ctx.close()
        browser.close()
    httpd.shutdown()

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Online two-client smoke passed: room {code}, emulator project demo-supe-pines.")


if __name__ == "__main__":
    main()
