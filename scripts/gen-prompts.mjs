#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, HEROES, SIGNALS } from '../js/data/index.js';

export const slugify = value => String(value).toLowerCase()
  .replace(/[’'′`]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const STYLE_PROMPTS = {
  ink: 'Street-level superhero noir rendered as a hand-inked comic panel: aggressive black brushwork, sharp silhouettes, off-register halftone dots, newsprint texture, selective dirty-cream, oxblood-red, and electric-blue spot color, hard rain-slicked light, human scale and lived-in city detail. Dynamic but readable single composition. No text, letters, logos, captions, speech balloons, borders, panels, watermarks, or gore. One unified full-bleed image, never a grid, montage, triptych, card frame, or repeated subject.',
  burden: 'Magical-realist portrait of an ordinary neighborhood under an impossible emotional weather: grounded human faces, tactile walls and worn objects, restrained painterly edges, warm sodium light against indigo shadow, and one lucid metaphor that physically embodies the subject’s Burden, shortcoming, or downfall. The impossible element must feel as matter-of-fact as a bus stop or a kitchen sink — intimate, specific, and consequential, never generic fantasy or glossy superhero spectacle. No text, letters, logos, captions, speech balloons, borders, panels, watermarks, or gore. One unified full-bleed image, never a grid, montage, triptych, card frame, or repeated subject.'
};

export const heroArt = {
  'The Nightwatch': {
    front:'A tired Black beat cop in a plain half-mask and reinforced patrol jacket on a tenement rooftop at 2 a.m., police radio in one hand, looking down toward a crime scene while his badge remains hidden inside the coat.',
    turned:'The same masked cop in the same patrol jacket under a failing rooftop light, knuckles bloodied against a brick wall, his exposed badge reflected in a rain puddle at his feet.'
  },
  Powerline: {
    front:'A broad-shouldered Latina utility lineman in a homemade insulated hero suit, climbing belt and ceramic cable cutters visible, crouched on a power pole above a dark neighborhood as blue current crawls safely across her gloves.',
    turned:'The same lineman amid a blown transformer and hanging cables, visor cracked, throwing her insulated body between a shower of sparks and an occupied apartment window.'
  },
  'Kid Chorus': {
    front:'A seventeen-year-old Korean American girl in a patched hooded jacket and compact ear protectors, standing in an alley as one controlled sonic ring ripples from her open mouth and rattles nearby windows.',
    turned:'The same teenage hero crouched after an uncontrolled blast, windows shattered outward around her, both hands clamped over her mouth while frightened silhouettes watch from a doorway.'
  },
  'The Concierge': {
    front:'An older West African doorman in a burgundy coat with brass buttons, impossibly strong hands holding a buckled apartment security gate open while tenants hurry through behind him.',
    turned:'The same doorman alone in the condemned lobby he has guarded for thirty years, holding up a cracked ceiling beam as eviction notices and plaster drift around him.'
  },
  'Widow’s Peak': {
    front:'A severe white woman in a black widow-shaped half-mask and practical mourning clothes, perched beside a cemetery angel above the city, clutching a worn wedding ring on a chain.',
    turned:'The same masked widow pinning an unseen suspect against a rain-blackened gravestone, her husband’s ring chain snapped and bright in the mud below.'
  },
  'The Understudy': {
    front:'A slim South Asian stage actor in a handmade midnight-blue costume, using mirrors, wire, smoke pellets, and perfect posture to appear superhuman under an alley fire escape spotlight.',
    turned:'The same actor backstage in a derelict theater, mask half removed, surrounded by visibly broken trick gear as an ominous silhouette waits beyond the stage curtain.'
  },
  Backline: {
    front:'A stocky nonbinary paramedic in dark off-duty clothes and a homemade medic harness, kneeling beside an injured stranger under an El track with one forbidden piece of glowing equipment open in a second trauma bag.',
    turned:'The same paramedic alone in the back of an empty ambulance after a brutal night, bloodied gloves on the floor and the unlicensed second bag open beside a silent radio.'
  },
  'The Ref': {
    front:'An older Puerto Rican boxing referee in a black half-mask and rolled white sleeves, stepping between two much larger brawlers in a basement gym with one hand raised to stop the fight.',
    turned:'The same referee in an abandoned ring after hours, ropes snapped and one fist clenched, watching a fallen figure just outside the light while the count reaches an unspoken final beat.'
  },
  Palisade: {
    front:'A young Black legal-aid attorney in shirtsleeves, tie, and a narrow domino mask, bracing both palms against a translucent gold force barrier stretched exactly across a tenement doorway while a family shelters behind it.',
    turned:'The same attorney trapped between two simultaneous attacks in a courthouse corridor, one doorway protected by the glowing barrier while an unprotected doorway behind them fills with smoke.'
  },
  Secondhand: {
    front:'An East Asian woman watch repairer in a dark mechanic apron and small round mask, frozen between clockwork fragments as she catches a bullet during five stolen seconds, every clock face around her stopped.',
    turned:'The same watchmaker waking on a deserted elevated-train platform with several minutes missing, loose watch gears in one palm and all station clocks pointing to different times.'
  },
  Rook: {
    front:'A wiry Arab American bicycle courier in a checker-pattern scarf and compact helmet mask, one hand redirecting the momentum of a speeding motorcycle into a curling ribbon of blue force on a narrow city street.',
    turned:'The same courier airborne above a rain-slicked intersection after sending too much force back, bicycle tumbling away as a familiar apartment window glows in the distance.'
  },
  Switchboard: {
    front:'A middle-aged Indigenous emergency dispatcher in a simple black mask and headset, seated at a night-shift console as one phone glows ninety seconds before its neighboring lines begin to ring.',
    turned:'The same dispatcher standing in a darkened call center surrounded by ringing phones, headset cord pulled taut toward an empty chair while a red countdown light reflects in the windows.'
  }
};

export const caseArt = {
  toll:'Ferrous Avenue at night beneath an El overpass, small storefronts shuttered one by one while three battered amusement-pier mascot figures — fox, rabbit, and one-eyed bear — collect envelopes under a flickering bakery sign with no readable lettering.',
  casting:'A spectacular new masked vigilante posing atop a wrecked car for phone cameras and television lights, adoring onlookers below while an injured petty criminal lies unnoticed at the edge of the frame.',
  renovation:'A lived-in brick block cut sharply in half by spotless luxury construction completed overnight, family belongings abandoned at the seam, a smiling councilwoman’s billboard present only as a faceless graphic with no readable text.',
  lastcall:'The interior of a worn neighborhood dive bar at last call, stools and old photographs untouched while the first punch in thirty years hangs suspended above the counter and the silent bartender watches.',
  afterhours:'A cramped night clinic under a failing fluorescent sign, nurses moving between tired patients while one locked medicine cabinet stands open and a private security car waits outside.',
  deadair:'A small community radio studio after midnight, one microphone lit and the other dark while a rain-streaked window reflects an unseen listener in the street.',
  lastroute:'A battered city bus stopped beneath an elevated track at 12:14 a.m., three empty seats lit inside while the route sign is deliberately unreadable and rain blurs the depot beyond.',
  openhouse:'A neighbourhood youth centre gym prepared for an open house, folding chairs and donated boxes under harsh lights while a security camera points at the locked exit.'
};

export const threatArt = {
  toll:'An unidentified racketeer seen only as a long shadow behind hanging fox, rabbit, and bear mascot heads in the dark maintenance tunnel of a shuttered amusement pier, payment envelopes stacked like trophies.',
  casting:'An unknown copycat vigilante with a too-perfect costume standing before a wall of camera flashes, face erased by white light while damaged homemade versions of local Heroes’ gear hang behind them.',
  renovation:'A composed female developer-councilwoman seen through layered blueprints and demolition dust, her face partly obscured by a pristine hardhat visor as occupied buildings disappear into blank paper behind her.',
  lastcall:'An unseen new owner seated in the Anchor’s darkest booth, only gloved hands and a ledger of crossed-out favors visible, while the bartender’s silhouette is reflected captive in a cracked mirror.',
  afterhours:'An unidentified contractor in a clean coat standing beyond a clinic’s locked triage doors, face hidden behind reflected ambulance lights while medicine crates and patient charts form a careful barrier.',
  deadair:'A faceless broadcaster seated behind a community radio microphone, one hand on a mixing board and the other holding a cassette marked only by a blank label, city lights distorted in the studio glass.',
  lastroute:'A shadowed transit fixer at the rear of an empty night bus, gloved hand holding a ring of route keys while the windows reflect stations that do not exist.',
  openhouse:'An obscured security supervisor in a youth-centre hallway, clipboard and copied sign-in sheets in hand while a row of cameras watches an empty gym.'
};

export const signalArt = {
  'A Dead Scanner Channel':'A battered handheld police scanner on a kitchen table, waveform frozen mid-syllable and one tiny red status light abruptly dark.',
  'A Torn Flyer':'A rain-soaked flyer ripped vertically on a telephone pole, showing half of an anonymous face and half of an unreadable phone number.',
  'A Phone at One Percent':'A scratched smartphone glowing on wet pavement with a nearly empty battery icon and an incoming call just about to vanish, no readable text.',
  'The Same Stray Cat':'A wary one-eared alley cat sitting beneath the same fire escape where distant emergency light spills around a corner.',
  'Sirens, Getting Closer':'Empty residential street washed in red and blue reflections from unseen approaching vehicles, the reflected lights ending suddenly halfway down the block.',
  'A Streetlight That Won’t Stay Lit':'A lone streetlight sputtering above a narrow alley, alternating bright and black around one indistinct figure.',
  'A Traffic Camera, Facing the Wrong Way':'A municipal traffic camera freshly twisted away from an intersection, tool scratches bright on its metal neck.',
  'An Umbrella, Inside Out':'A black umbrella blown inside out and abandoned upright on a stoop despite perfectly still rain.',
  'A Key That Fits Nothing You Own':'A strange worn brass key in the palm of a coat pocket, surrounded by unfamiliar lint and one dark red thread.',
  'Yesterday’s Front Page':'A folded newspaper on a diner counter with photographs and columns blurred into unreadable shapes, one front-page image visibly contradicted by the scene outside the window.',
  'A Bandage, Already Bled Through':'A hastily wrapped hand resting on a sink edge, white gauze already dark with blood but no wound shown.',
  'A Manhole Cover, Slightly Askew':'A heavy manhole cover shifted open by one inch on an empty street, warm light and a curl of steam rising through the gap.',
  'A Stopwatch, Still Running':'A dented mechanical stopwatch on concrete, second hand still sweeping long after an unseen event ended.',
  'A Costume Piece, Not Yours':'One unfamiliar armored glove hanging from a fire-escape rung beside scraps of several homemade hero costumes.',
  'The El, Running Late':'An empty elevated-train platform after midnight, arrival clock unreadable, tunnel lights visible but never moving closer.',
  'A Flock of Pigeons, All at Once':'A dense burst of pigeons leaving one rooftop simultaneously while a single human silhouette remains below them.',
  'A Chalk Mark Under Fresh Paint':'A small geometric chalk mark reappearing through wet grey paint on a brick service door, fresh chalk dust on the ground.',
  'A Bus Transfer for a Dead Route':'A faded paper bus transfer pinched between two fingers, freshly punched, with route markings intentionally unreadable and an abandoned bus stop behind it.',
  'Police Tape, Cut Clean':'A strand of police tape sliced neatly and retied across a dark doorway, printed markings abstract and unreadable.',
  'A Voicemail with No Voice':'An old smartphone beside a small speaker waveform showing only footsteps and a door slam, interface symbols visible but no readable words.',
  'One Wet Footprint':'One rain-wet shoe print centered on a dry apartment hallway floor, with no other tracks in either direction.',
  'A Matchbook from a Closed Club':'A vintage matchbook with one match missing on a closed nightclub’s dusty bar, cover design worn blank with no readable lettering.',
  'A Prescription Bottle, Wrong Name':'An amber prescription bottle under bathroom light, label deliberately out of focus, reflected beside an old framed memorial photograph.',
  'An Elevator Between Floors':'Old elevator doors opened onto a solid brick wall, one brick displaced inward as if something knocked from behind it.',
  'A Broken Zip Tie':'A snapped black zip tie on a concrete floor, broken outward with a single dark hair caught in its teeth.',
  'Fresh Concrete, Still Warm':'A rectangle of new concrete steaming faintly in an old basement floor, one handprint beginning to rise instead of sink.',
  'A Payphone Ringing Once':'A rain-beaded payphone receiver trembling on its hook under a dead neon awning, one isolated ring visualized by a subtle vibration.',
  'A Grocery Receipt at 3:17 AM':'A curling grocery receipt under harsh all-night market light, three item rows and a timestamp rendered as unreadable marks, a handwritten address shape on the back.',
  'Blue Thread on a Fire Escape':'A single bright blue thread snagged three stories high on a rusty fire escape, pulled taut against the direction of the wind.',
  'An Apartment Light Blinking in Code':'One apartment window blinking in a deliberate pattern across a mostly dark brick courtyard, then revealing a different silhouette.',
  'Two Identical License Plates':'Two nearly identical dark sedans parked across from one another, matching license plates visible as the same unreadable pattern and matching dents on both bumpers.',
  'A Child’s Drawing of the Block':'A crayon drawing of a familiar city block held in small hands, every window black except one impossible extra window glowing yellow, no readable writing.'
};

export function validatePromptCoverage(){
  const errors = [];
  const heroRoles = new Set(HEROES.map(hero => hero.role));
  const caseIds = new Set(CASES.map(item => item.id));
  const signalTitles = new Set(SIGNALS.map(item => item.title));

  HEROES.forEach(hero => {
    const entry = heroArt[hero.role];
    if(!entry?.front?.trim()) errors.push(`Heroes [${hero.role}]: missing front art direction.`);
    if(!entry?.turned?.trim()) errors.push(`Heroes [${hero.role}]: missing turned art direction.`);
  });
  Object.keys(heroArt).filter(role => !heroRoles.has(role)).forEach(role => errors.push(`Heroes [${role}]: art direction has no matching Hero.`));

  CASES.forEach(item => {
    if(!caseArt[item.id]?.trim()) errors.push(`Cases [${item.id}]: missing art direction.`);
    if(!threatArt[item.id]?.trim()) errors.push(`Threats [${item.id}]: missing art direction.`);
  });
  Object.keys(caseArt).filter(id => !caseIds.has(id)).forEach(id => errors.push(`Cases [${id}]: art direction has no matching Case.`));
  Object.keys(threatArt).filter(id => !caseIds.has(id)).forEach(id => errors.push(`Threats [${id}]: art direction has no matching Case.`));

  SIGNALS.forEach(item => { if(!signalArt[item.title]?.trim()) errors.push(`Signals [${item.title}]: missing art direction.`); });
  Object.keys(signalArt).filter(title => !signalTitles.has(title)).forEach(title => errors.push(`Signals [${title}]: art direction has no matching Signal.`));
  return errors;
}

export function buildPromptSheet(){
  const lines = [];
  const write = (...parts) => lines.push(parts.join(''));
  const saveLine = (style, category, id) => `art/images/${style}/${category}/${id}.png`;
  write('# Supe Pines — Card Art Prompt Sheet');
  write('');
  write('Two visual languages for every Hero side, Case, Signal, and Threat. Each subject prompt is combined with one of the master style blocks below by `scripts/gen-manifest.mjs`.');
  write('');
  write('## Master styles');
  write('');
  write('### Comic Ink');
  write('');
  write(`> ${STYLE_PROMPTS.ink}`);
  write('');
  write('### Burden Realist');
  write('');
  write(`> ${STYLE_PROMPTS.burden}`);
  write('');
  write('Portrait art uses 3:4; Signals use 1:1. The Gallery also accepts JPG, JPEG, and WebP at the same extensionless paths.');
  write('');
  write(`## Heroes (${HEROES.length * 4} images)`);
  write('');
  HEROES.forEach(hero => {
    const id = slugify(hero.role);
    const art = heroArt[hero.role];
    write(`### ${hero.role}`);
    write('');
    write(`- Front: ${art.front}`);
    write(`- Turned: ${art.turned}`);
    write(`- Comic Ink: \`${saveLine('ink', 'heroes', `${id}--front`)}\`, \`${saveLine('ink', 'heroes', `${id}--turned`)}\``);
    write(`- Burden Realist: \`${saveLine('burden', 'heroes', `${id}--front`)}\`, \`${saveLine('burden', 'heroes', `${id}--turned`)}\``);
    write('');
  });
  write(`## Cases (${CASES.length * 2} images)`);
  write('');
  CASES.forEach(item => {
    write(`### ${item.title}`);
    write('');
    write(caseArt[item.id]);
    write('');
    write(`Save as \`${saveLine('ink', 'cases', item.id)}\` and \`${saveLine('burden', 'cases', item.id)}\`.`);
    write('');
  });
  write(`## Signals (${SIGNALS.length * 2} images)`);
  write('');
  SIGNALS.forEach(item => {
    const id = slugify(item.title);
    write(`### ${item.glyph} ${item.title}`);
    write('');
    write(signalArt[item.title]);
    write('');
    write(`Save as \`${saveLine('ink', 'signals', id)}\` and \`${saveLine('burden', 'signals', id)}\`.`);
    write('');
  });
  write(`## Threats (${CASES.length * 2} images)`);
  write('');
  CASES.forEach(item => {
    write(`### ${item.title} — The Threat`);
    write('');
    write(threatArt[item.id]);
    write('');
    write(`Save as \`${saveLine('ink', 'threats', item.id)}\` and \`${saveLine('burden', 'threats', item.id)}\`.`);
    write('');
  });
  write(`Total: ${HEROES.length * 4 + CASES.length * 4 + SIGNALS.length * 2} images across both styles.`);
  return `${lines.join('\n')}\n`;
}

function usage(){
  console.log(`Usage: node scripts/gen-prompts.mjs [options]\n\nOptions:\n  --check          Validate prompt coverage without writing a file\n  --stdout         Print the generated prompt sheet to stdout\n  --output PATH    Write to PATH (default: art/IMAGE_PROMPTS.md)\n  --help           Show this help`);
}

function main(){
  const args = process.argv.slice(2);
  if(args.includes('--help')){ usage(); return; }
  const errors = validatePromptCoverage();
  if(errors.length){
    console.error(`Prompt coverage failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }
  if(args.includes('--check')){
    console.log(`Prompt coverage valid: ${HEROES.length} Heroes, ${CASES.length} Cases, ${SIGNALS.length} Signals, ${CASES.length} Threats; 2 styles.`);
    return;
  }
  const sheet = buildPromptSheet();
  if(args.includes('--stdout')){ process.stdout.write(sheet); return; }
  const outputIndex = args.indexOf('--output');
  if(outputIndex !== -1 && !args[outputIndex + 1]){
    console.error('--output requires a path.');
    process.exitCode = 1;
    return;
  }
  const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const output = path.resolve(repo, outputIndex === -1 ? 'art/IMAGE_PROMPTS.md' : args[outputIndex + 1]);
  fs.mkdirSync(path.dirname(output), { recursive:true });
  fs.writeFileSync(output, sheet);
  console.log(`Wrote ${path.relative(repo, output)}.`);
}

const directPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if(directPath && fileURLToPath(import.meta.url) === directPath) main();
