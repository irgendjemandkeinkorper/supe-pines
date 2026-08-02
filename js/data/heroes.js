const setupFor = (role, clue) => ({
  toll:`The Sophist is turning Ferrous Avenue into a moral laboratory, and ${role} notices ${clue}. What did you understand about the experiment before anyone else did?`,
  casting:`The Forge is arming a copycat vigilante crew with military-grade equipment. ${role} finds ${clue}. What did you keep out of the report?`,
  renovation:`The Alderman's buildings make people feel exactly what he wants them to feel. ${role} visits a condemned block and notices ${clue}. What did the room try to make you believe?`,
  lastcall:`Omen has started killing people for crimes they have not committed yet. At the Anchor, ${role} finds ${clue}. Who did you decide deserved the benefit of the doubt?`,
  afterhours:`Hemlock's pain-severing drug is moving through Saint Agnes. During a night call, ${role} sees ${clue}. What did you do before the professionals arrived?`,
  deadair:`The Broadcaster is editing Millhaven through the airwaves. ${role} catches ${clue}. What truth did you hear underneath the story?`,
  lastroute:`The Ferryman is using the missing part of the 9B route to move people and evidence. ${role} discovers ${clue}. What would you have to forget to follow it?`,
  openhouse:`The Alchemist's narcotics are turning the Franklin centre into a market. ${role} notices ${clue}. Who did you protect from becoming somebody's supply?`
});

function makeHero({role, group, power, flaw, flavor, clue, good, bad}){
  return {
    role, group, power, flaw, flavor,
    setup:setupFor(role, clue),
    sides:[
      {state:'Good Day', ...good},
      {state:'Bad Day', ...bad}
    ]
  };
}

export const HEROES = [
  makeHero({
    role:'Ballast', group:'The Anchor',
    power:'Extreme density shifting: impenetrable weight or silent weightlessness.',
    flaw:'Her physical state dictates her emotional one. Density brings absolute apathy; weightlessness brings paralyzing sensory hyper-empathy.',
    flavor:'A human ballast tank who carries the neighborhood through disasters, provided she can stay balanced long enough to care.',
    clue:'a load-bearing wall has been altered without leaving a permit trail',
    good:{title:'The Anchor', detail:'She holds a medium density, absorbs the hit, and puts bystanders first even when the villain gets away.', cond:'If you choose the lives in front of you over the cleanest tactical win…', tone:'Guilt'},
    bad:{title:'The Wrecking Ball', detail:'She becomes cold, maxes out her density, and turns structural damage into an acceptable line in the equation.', cond:'If you treat screaming bystanders as collateral because the math says the villain matters more…', tone:'Fury'}
  }),
  makeHero({
    role:'Apex', group:'The Anchor',
    power:'Perfect kinetic memory and hyper-reflexes.',
    flaw:'His muscles memorize trauma alongside movement. Reusing a fighting style forces him to relive the pain of the fight that taught it to him.',
    flavor:'A once-in-a-generation fighter who would rather spend the night making an opponent miss than remember how it felt to break them.',
    clue:'a security camera shows a fighting style he knows but cannot bear to use',
    good:{title:'The Maestro', detail:'He uses evasive aikido to exhaust opponents, refusing to strike back so he does not add another ghost to his body.', cond:'If you keep an opponent safe even when striking back would end the fight faster…', tone:'Guilt'},
    bad:{title:'The Brute', detail:'Chronic pain and exhaustion turn mercy into an inconvenience. He finishes fights with brutal, bone-breaking efficiency.', cond:'If pain and impatience make you break someone just to make the fight stop…', tone:'Fury'}
  }),
  makeHero({
    role:'The Pulse', group:'The Anchor',
    power:"Absorbing and redirecting Millhaven's electromagnetic energy.",
    flaw:"They cannot generate bio-electricity. They drain the city's infrastructure just to keep their heart beating.",
    flavor:'A living emergency circuit, meticulous about what they take until the city asks them to save it at a price it cannot afford.',
    clue:'a dead circuit has been siphoned clean while the occupied apartments beside it stayed lit',
    good:{title:'The Defibrillator', detail:'They draw only from broken or abandoned circuits and fight with precise, non-lethal static shocks.', cond:'If you leave the lights on for people who need them, even when it makes your own heart fail faster…', tone:'Guilt'},
    bad:{title:'The Blackout', detail:'They drain entire residential grids in winter to overcharge for a fight, convinced protection entitles them to the power.', cond:'If you take power from a neighborhood that needs it so you can win…', tone:'Fury'}
  }),
  makeHero({
    role:'Dialectic', group:'The Panopticon',
    power:'Hard-light illusions that fool all five senses.',
    flaw:'They can project only what they temporarily believe is objective truth, slowly fracturing their grip on reality.',
    flavor:'A theatrical truth-teller who can make a street become a stage, if they can still tell the audience from the scenery.',
    clue:'a witness remembers a doorway that never existed but describes its smell perfectly',
    good:{title:'The Storyteller', detail:'They use witty, harmless distractions to make violence unnecessary and give frightened people a way out.', cond:'If you use an illusion to open a path to safety instead of to punish someone…', tone:'Guilt'},
    bad:{title:'The Liar', detail:'Paranoia eats the edges of the world. They torture thugs with traumatic illusions and snap at teammates who may be hallucinations.', cond:'If you make someone doubt their own reality because winning matters more than what is true…', tone:'Dread'}
  }),
  makeHero({
    role:'Amp', group:'The Panopticon',
    power:'Absorbing ambient noise to release kinetic blasts or localized silence fields.',
    flaw:'When they are not absorbing sound, agonizing internal tinnitus makes silence physically painful.',
    flavor:'A quiet-room specialist who can end a gunfight in a breath, if the silence does not become louder than the people inside it.',
    clue:'the block is quiet in a way that makes every heartbeat feel like evidence',
    good:{title:'The Silencer', detail:'They use silence bubbles to neutralize gunfire and panic without adding another violent sound to the block.', cond:'If you choose focused quiet that protects people instead of feeding your own pain…', tone:'Guilt'},
    bad:{title:'The Siren', detail:'They crave noise to drown out the tinnitus, shattering windows and rupturing eardrums until every skirmish becomes a concert.', cond:'If you turn a minor conflict into an eruption because other people’s pain is quieter than your own…', tone:'Fury'}
  }),
  makeHero({
    role:'Knot', group:'The Panopticon',
    power:'Telekinesis limited to strings, wires, ropes, and chains.',
    flaw:'The more physical connections they manipulate, the more obsessive and possessive they become about their territory.',
    flavor:'A rooftop trap-setter who can tie a whole escape route into a single gesture, and who has to keep asking where protection ends.',
    clue:'a fire escape has been tied into a perfect route that nobody is allowed to leave',
    good:{title:'The Weaver', detail:'They catch falling debris, set quiet traps, and leave restrained thugs for the police without claiming the street as their own.', cond:'If you make a safe path for people you do not control…', tone:'Guilt'},
    bad:{title:'The Spider', detail:'They web up alleys and allies alike, demanding permission from everyone who moves through the territory.', cond:'If you trap allies as readily as enemies because nobody else can be trusted with your block…', tone:'Dread'}
  }),
  makeHero({
    role:'Catharsis', group:'The Stitchers',
    power:'Accelerated biological healing through physical touch.',
    flaw:'Mass cannot be created or destroyed. To heal a wound, they must take it into themselves or force it onto a third party.',
    flavor:'A reluctant street medic who carries other people’s injuries long after the ambulance leaves.',
    clue:'a victim has been healed, but the same wound is beginning to bloom under your own skin',
    good:{title:'The Martyr', detail:'They absorb stab wounds and broken bones from innocent people, then spend the recovery in bed so someone else can go home.', cond:'If you take a wound into yourself when nobody innocent can safely carry it…', tone:'Guilt'},
    bad:{title:'The Syphon', detail:'They heal a bystander by transferring the fatal wound directly into the thug who caused it, becoming judge, jury, and executioner.', cond:'If you force a fatal wound onto someone because you decide they deserve it…', tone:'Fury'}
  }),
  makeHero({
    role:'Gravel', group:'The Stitchers',
    power:'Geokinesis limited exclusively to urban asphalt and concrete.',
    flaw:'Each use hardens the calcium in their joints. Extended manipulation slowly turns them into a statue.',
    flavor:'A stubborn defender of the block whose body is becoming one more piece of its infrastructure.',
    clue:'the pavement has risen into a wall, and your knees have not fully bent since',
    good:{title:'The Barricade', detail:'They build cover, ramps, and escape routes, staying between stray bullets and the people who cannot outrun them.', cond:'If you spend your body to make a way out for civilians…', tone:'Guilt'},
    bad:{title:'The Tomb', detail:'They stop moving and bury criminals in asphalt alive, leaving the police to dig out the screaming men.', cond:'If you bury a person in the street because making a proper arrest feels too painful…', tone:'Fury'}
  }),
  makeHero({
    role:'The Moth', group:'The Stitchers',
    power:"Gliding mechanics, grappling hooks, and unmatched parkour mapping of Millhaven's rooftops.",
    flaw:'They are hyper-competent in the air, but touching actual ground triggers paralyzing panic attacks.',
    flavor:'A rooftop guardian who knows every ledge in Millhaven and is terrified of the first step after the landing.',
    clue:'a perfect overhead route ends above a mugging on a street you cannot make yourself enter',
    good:{title:'The Watchman', detail:'They provide flawless overwatch, call tactical advantages, and drop smoke exactly where the team needs it.', cond:'If you use the high ground to make someone else’s rescue possible…', tone:'Guilt'},
    bad:{title:'The Voyeur', detail:'They sit safely above the street and watch a mugging unfold because the ground is more frightening than the victim’s cries.', cond:'If fear keeps you watching from above when you could drop down and help…', tone:'Dread'}
  }),
  makeHero({
    role:'Cipher', group:'The Bloodhounds',
    power:'Psychometric chemoreception: he reads an object’s immediate history and emotional residue by tasting it.',
    flaw:'He absorbs trace chemical and emotional toxins. A murder weapon causes panic; a drug stash gets him high.',
    flavor:'A forensic bloodhound who can taste a crime scene into focus, then has to survive what the evidence leaves in his mouth.',
    clue:'the blood on a discarded tool carries the victim’s last thought and a chemical high',
    good:{title:'The Detective', detail:'He takes one careful taste, gets the team a license plate, spits out the residue, and points them toward the truth.', cond:'If you take only what the evidence gives you and stop before the rush becomes the point…', tone:'Guilt'},
    bad:{title:'The Addict', detail:'He swallows evidence to experience the unfiltered adrenaline of a victim’s last moments, becoming a hallucinating liability.', cond:'If you consume the evidence because the crime scene feels better than your own head…', tone:'Dread'}
  }),
  makeHero({
    role:'Lumen', group:'The Bloodhounds',
    power:'Broad-spectrum light projection and ultraviolet/infrared sight.',
    flaw:'The brighter their own light shines, the less they can see in the visible spectrum. Overuse can blind them for days.',
    flavor:'A patient tracker who can turn a dark warehouse into a map, until illumination costs them the ability to see the people in it.',
    clue:'a blood trail is visible only in a wavelength that will leave you blind before sunrise',
    good:{title:'The Searchlight', detail:'They keep the beam low and focused, revealing invisible clues without alerting the guards.', cond:'If you keep the light precise enough to find the truth without burning anyone to get it…', tone:'Guilt'},
    bad:{title:'The Interrogator', detail:'They abandon tracking for torture, using UV light to burn confessions out of thugs while stumbling blind among the shadows.', cond:'If you blind or burn someone for an answer you could have earned another way…', tone:'Fury'}
  }),
  makeHero({
    role:'Proxy', group:'The Bloodhounds',
    power:'Astral projection and temporary possession of recently deceased corpses.',
    flaw:'Their living body sympathetically mimics the decay and rigor mortis of the corpse they inhabit.',
    flavor:'A compassionate conduit who borrows the dead for one last message, knowing their own heart may stop if they stay too long.',
    clue:'a dead witness has two minutes of movement left, and your own hands are already stiffening',
    good:{title:'The Medium', detail:'They borrow a victim’s body for exactly two minutes to comfort a loved one or name a killer, then return it respectfully.', cond:'If you leave the dead as soon as their message has been heard…', tone:'Guilt'},
    bad:{title:'The Ghoul', detail:'They abandon their real body to pilot a corpse as a meat-shield, staying inside until their living heart nearly stops.', cond:'If you keep a corpse moving because it is more useful to you than the life you left behind…', tone:'Dread'}
  }),
  makeHero({
    role:'Ricochet', group:'The Enforcers',
    power:'Kinetic energy absorption and reflection.',
    flaw:'Absorbed energy does not dissipate. If he holds it too long, it causes massive internal hemorrhaging.',
    flavor:'A walking impact sink who can turn a barrage into a shield, provided he releases the hurt before it becomes a weapon.',
    clue:'your ribs are full of stored gunfire and the next shot is aimed at somebody smaller than you',
    good:{title:'The Shield', detail:'He steps into bullets and bats, then disperses their energy harmlessly into the asphalt beneath his feet.', cond:'If you take the hit meant for someone else and release the force before it can hurt the block…', tone:'Guilt'},
    bad:{title:'The Bomb', detail:'He wades into crossfire to charge himself, then detonates a block-shattering shockwave regardless of who is nearby.', cond:'If you hold the pain on purpose because the blast matters more than the people inside it…', tone:'Fury'}
  }),
  makeHero({
    role:'Splicer', group:'The Enforcers',
    power:'Osteokinesis: temporary armor plating and bone-blades extruded from their own skeleton.',
    flaw:'Every extrusion steals calcium from the internal skeleton, causing severe temporary osteoporosis.',
    flavor:'A disciplined close-quarters specialist whose best weapon is also the thing their body cannot afford to lose.',
    clue:'an opponent is disarmed, but your spine is beginning to buckle under the calcium debt',
    good:{title:'The Blademaster', detail:'They use minimal, precise extrusions to disarm opponents and end fights without lethal damage.', cond:'If you use only the bone you need to make the danger stop…', tone:'Guilt'},
    bad:{title:'The Porcupine', detail:'Rage drives them to rip out a massive bone-mech suit, risking a permanent spinal break for intimidation.', cond:'If you tear yourself apart for the satisfaction of making everyone else afraid…', tone:'Fury'}
  }),
  makeHero({
    role:'Strobe', group:'The Enforcers',
    power:'Localized time-skipping: they can teleport their consciousness up to five seconds into the future.',
    flaw:'Their physical body freezes in place and remains completely vulnerable until consciousness catches up.',
    flavor:'An infiltrator who can skip a lock, a laser, or a punch, but never the five seconds when their body is left behind.',
    clue:'your body is frozen under a security camera while your mind is already watching what happens next',
    good:{title:'The Ghost', detail:'They skip past lasers and armed guards to use quiet, non-lethal sleeper holds.', cond:'If you use the skip to pass danger without leaving your frozen body to be punished…', tone:'Guilt'},
    bad:{title:'The Glitch', detail:'They abuse the skip in combat, waking bloodied and concussed, then seek extreme vengeance for damage they chose to risk.', cond:'If you let your body be beaten because revenge afterward feels worth the debt…', tone:'Fury'}
  })
];
