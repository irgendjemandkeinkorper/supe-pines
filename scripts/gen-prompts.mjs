#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, HEROES, SIGNALS, VILLAINS } from '../js/data/index.js';

export const slugify = value => String(value).toLowerCase()
  .replace(/[’'′`]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const STYLE_PROMPTS = {
  ink: 'Street-level superhero noir rendered as a hand-inked comic panel: aggressive black brushwork, sharp silhouettes, off-register halftone dots, newsprint texture, selective dirty-cream, oxblood-red, and electric-blue spot color, hard rain-slicked light, human scale and lived-in city detail. Dynamic but readable single composition. No text, letters, logos, captions, speech balloons, borders, panels, watermarks, or gore. One unified full-bleed image, never a grid, montage, triptych, card frame, or repeated subject.',
  expressionist: 'Late-1990s Japanese cyberpunk noir anime illustration: confident expressive ink line, cel-shaded planes, cinematic perspective, rain-slick industrial neighborhoods, hard rim light, restrained electric cyan and sodium amber, and serious human-scale melancholy. Blend jazz-noir atmosphere with tactile cyberpunk infrastructure and lived-in faces; keep the impossible power legible without glossy franchise spectacle. No text, letters, logos, captions, speech balloons, borders, panels, watermarks, or literal card frames. One unified full-bleed image, never a grid, montage, triptych, or repeated subject.'
};

export const heroArt = {
  Ballast: {
    front:'A Black woman in practical urban rescue gear and a heavy asymmetrical coat, standing at medium density between frightened tenants and a collapsing tenement entrance, masonry stopping against her calm stance while a few feathers drift around her.',
    turned:'The same woman in the same coat made impossibly massive in a rain-slick street, one boot crushing asphalt as a load-bearing column falls toward a getaway car and civilians flee the dust.'
  },
  Apex: {
    front:'A lean Black man in a battered training jacket and taped hands, moving through a rain-dark alley with perfect evasive aikido footwork as several attackers stumble past him without being struck.',
    turned:'The same fighter under a brutal warehouse light, body locked into a bone-breaking finishing strike while ghostlike motion trails of earlier fights coil around his shoulders.'
  },
  'The Pulse': {
    front:'A gender-nonconforming figure in a weatherproof coat and insulated gloves, siphoning a thin blue current from a broken street cabinet while every occupied apartment behind them stays warmly lit.',
    turned:'The same figure at the center of a winter blackout, residential windows dark, electrical arcs crawling through their body as they overcharge for a fight in the street.'
  },
  Dialectic: {
    front:'A sharp-featured nonbinary performer in a long coat and half-mask, projecting a harmless hard-light carnival across a tense street so armed people stare at a bright impossible parade instead of each other.',
    turned:'The same performer in a fractured apartment corridor surrounded by terrifying duplicate doorways and false teammates, reaching toward a hallucinated friend while every surface insists it is real.'
  },
  Amp: {
    front:'A stoic brown-skinned sound specialist in a compact armored coat, holding one hand over a silent gunfight as a clean circular silence field settles around the muzzle flashes and frightened neighbors escape.',
    turned:'The same specialist in a shattered storefront, releasing a violent kinetic wave through speakers and windows while the whole street vibrates like a distorted concert.'
  },
  Knot: {
    front:'A wiry figure in a hooded coat on a fire escape, telekinetically tying falling debris into a suspended safety net of ropes and wires while restrained thieves wait quietly for police.',
    turned:'The same figure in a webbed alley, chains and cables covering every exit, allies and enemies pinned to the walls as the hero stands possessively at the center.'
  },
  Catharsis: {
    front:'A tired street medic in a rain-dark clinic doorway, one hand on an injured stranger as the wound leaves the patient and appears as a matching bruise and fracture across the medic’s own body.',
    turned:'The same medic standing over a stunned attacker as a fatal wound tears across the attacker’s body while the innocent bystander beside them heals, the hero’s face cold and resolved.'
  },
  Gravel: {
    front:'A broad urban sentinel in work clothes raising a wall of asphalt and concrete between a neighborhood and incoming bullets, a rough ramp leading families toward an open street.',
    turned:'The same sentinel half-petrified in a street of rising asphalt, joints locked into stone as screaming criminals disappear beneath a fresh concrete tomb.'
  },
  'The Moth': {
    front:'A compact rooftop guardian in a gliding rig and grappling harness, perched above Millhaven with a precise map of fire escapes and smoke bombs ready, a rescue route glowing below.',
    turned:'The same guardian clinging to a gargoyle far above a mugging, wings folded tight and eyes fixed downward while the terrified victim remains out of reach on the street.'
  },
  Cipher: {
    front:'A Black man in a forensic coat and respirator mask crouched at a murder scene, touching one drop of blood to his tongue as a license plate appears in the rain-slick reflection of his eyes.',
    turned:'The same detective swallowing evidence from a drug stash, hallucinated crime-scene colors and chemical symbols spiraling around him while investigators back away.'
  },
  Lumen: {
    front:'A dark-skinned light tracker in a hooded coat, projecting a narrow ultraviolet beam through a warehouse to reveal a blood trail and chemical marks without waking the guards.',
    turned:'The same tracker stumbling blind in a white-hot interrogation room as burning ultraviolet light reflects from a terrified suspect and the hero lashes at shadows.'
  },
  Proxy: {
    front:'A compassionate figure in a dark coat kneeling beside a recently deceased witness, astral light leaving their body as the corpse briefly opens its eyes to whisper a name to grieving family and police.',
    turned:'The same figure’s living body lies cold in an alley while their spirit pilots a decaying corpse as a meat-shield through a brutal street fight.'
  },
  Ricochet: {
    front:'A broad Black man in a reinforced street suit standing in front of his team, bullets and baseball bats flattening into blue kinetic ripples before harmless force drains into the asphalt beneath his boots.',
    turned:'The same man walking into a crossfire with hemorrhage-red energy packed beneath his skin, releasing a block-shattering shockwave through cars, windows, and bystanders.'
  },
  Splicer: {
    front:'A disciplined fighter in a sleeveless armored coat, extruding two precise bone-blades from their forearms to disarm a gang member in a narrow alley without drawing blood.',
    turned:'The same fighter inside a massive terrifying bone-mech silhouette, calcium spikes everywhere, spine arched dangerously as gangs kneel in fear around them.'
  },
  Strobe: {
    front:'A compact infiltrator in a matte tactical suit stepping through a security laser grid, consciousness trailing a translucent five-second ghost while their frozen body remains safely hidden behind a pillar.',
    turned:'The same infiltrator waking bloody and concussed after repeated temporal skips, frozen afterimages being beaten apart behind them as they turn toward the attackers with homicidal rage.'
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
  sophist:'The Sophist in a dark maintenance tunnel behind hanging fox, rabbit, and bear mascot heads, payment envelopes arranged beside physical ledgers covered in paranoid diagrams, face caught between certainty and doubt.',
  hemlock:'Hemlock in a clinic corridor filled with smiling, fearless thugs, a translucent chemical haze around her while invisible broken bones and phantom pain coil through her own silhouette.',
  forge:'The Forge inside an abandoned foundry, body glowing from internal fire as military-grade weapons and molten bullet casings surround him, feverish and starving beneath the orange furnace light.',
  alderman:'The Alderman in a pristine civic atrium whose architecture bends into calming geometric corridors, smiling crowds moving exactly as designed while an unrenovated brick room waits like a dark void behind him.',
  broadcaster:'The Broadcaster behind a local news microphone and studio glass, a city map rewriting itself in the reflection while gravity fails around loose papers and impossible shadows repeat on the wall.',
  ferryman:'The Ferryman standing between two impossible dark alleys connected by a shadow tunnel, a passenger’s fading memory visualized as a missing photograph while route signs point to places that do not exist.',
  alchemist:'The Alchemist in a cramped street pharmacy laboratory, colorful chemical vapor beading on their skin while gang members reach through a shuttered storefront toward the living source of their next high.',
  omen:'Omen in an empty bar at closing time, one hour of future violence reflected in their eyes, a silent script of approaching blows laid across the floor like a path they cannot leave.'
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
  'A Child’s Drawing of the Block':'A crayon drawing of a familiar city block held in small hands, every window black except one impossible extra window glowing yellow, no readable writing.',
  'Neon Bleed':'Rain-slick cobblestones reflecting a garish pink neon sign that stutters overhead, artificial warmth failing to hide cold corruption.',
  'Static Fog':'Thick unnatural mist rolling off the Millhaven river, distant sirens and radio chatter reduced to distorted shapes in the haze.',
  'Shattered Glass':'Quiet dust settling after violence as streetlamps filter through the jagged teeth of a broken diner window and damaged skyline.',
  'Cigarette Embers':'One glowing cigarette ember in an otherwise black alley, a tiny signal that someone is watching but not yet acting.',
  'Clockwork Sirens':'An empty Millhaven street at exactly 3:00 AM, rhythmic siren light and sound repeating with mechanical precision around unseen bleeding lives.'
};

export function validatePromptCoverage(){
  const errors = [];
  const heroRoles = new Set(HEROES.map(hero => hero.role));
  const caseIds = new Set(CASES.map(item => item.id));
  const villainIds = new Set(VILLAINS.map(item => item.id));
  const signalTitles = new Set(SIGNALS.map(item => item.title));

  HEROES.forEach(hero => {
    const entry = heroArt[hero.role];
    if(!entry?.front?.trim()) errors.push(`Heroes [${hero.role}]: missing front art direction.`);
    if(!entry?.turned?.trim()) errors.push(`Heroes [${hero.role}]: missing turned art direction.`);
  });
  Object.keys(heroArt).filter(role => !heroRoles.has(role)).forEach(role => errors.push(`Heroes [${role}]: art direction has no matching Hero.`));

  CASES.forEach(item => {
    if(!caseArt[item.id]?.trim()) errors.push(`Cases [${item.id}]: missing art direction.`);
    if(!villainIds.has(item.villainId)) errors.push(`Cases [${item.id}]: unknown villain ${item.villainId}.`);
  });
  Object.keys(caseArt).filter(id => !caseIds.has(id)).forEach(id => errors.push(`Cases [${id}]: art direction has no matching Case.`));
  VILLAINS.forEach(villain => {
    if(!threatArt[villain.id]?.trim()) errors.push(`Threats [${villain.id}]: missing art direction.`);
  });
  Object.keys(threatArt).filter(id => !villainIds.has(id)).forEach(id => errors.push(`Threats [${id}]: art direction has no matching Villain.`));

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
  write('### Anime Noir');
  write('');
  write(`> ${STYLE_PROMPTS.expressionist}`);
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
    write(`- Anime Noir: \`${saveLine('expressionist', 'heroes', `${id}--front`)}\`, \`${saveLine('expressionist', 'heroes', `${id}--turned`)}\``);
    write('');
  });
  write(`## Cases (${CASES.length * 2} images)`);
  write('');
  CASES.forEach(item => {
    write(`### ${item.title}`);
    write('');
    write(caseArt[item.id]);
    write('');
    write(`Save as \`${saveLine('ink', 'cases', item.id)}\` and \`${saveLine('expressionist', 'cases', item.id)}\`.`);
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
    write(`Save as \`${saveLine('ink', 'signals', id)}\` and \`${saveLine('expressionist', 'signals', id)}\`.`);
    write('');
  });
  write(`## Threats (${VILLAINS.length * 2} images)`);
  write('');
  VILLAINS.forEach(item => {
    write(`### ${item.name} — The Threat`);
    write('');
    write(threatArt[item.id]);
    write('');
    write(`Save as \`${saveLine('ink', 'threats', item.id)}\` and \`${saveLine('expressionist', 'threats', item.id)}\`.`);
    write('');
  });
  write(`Total: ${HEROES.length * 4 + CASES.length * 2 + SIGNALS.length * 2 + VILLAINS.length * 2} images across both styles.`);
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
    console.log(`Prompt coverage valid: ${HEROES.length} Heroes, ${CASES.length} Cases, ${SIGNALS.length} Signals, ${VILLAINS.length} Threats; 2 styles.`);
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
