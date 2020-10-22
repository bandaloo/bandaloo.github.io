(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogueManager = exports.template = void 0;
function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
function template(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.template = template;
class DialogueManager {
    constructor(artMaker, dialogue, id = "dialogue") {
        this.curIndex = 0;
        this.nodes = new Map();
        this.store = {
            gotLeftPills: false,
            gotRightPills: false,
            clockMood: 0,
            lastAnswerRight: false,
            wrongAnswersAllowed: 0,
            correctAnswers: 0,
            playerWentFirst: false,
            quizPassed: false,
            trauma: 0,
            bombSurvivalPercent: 0,
            roll: 0,
            tensRoll: "",
            onesRoll: "",
            survivedBomb: false,
            safePassage: false,
        };
        this.artMaker = artMaker;
        this.dialogue = dialogue;
        const div = document.getElementById(id);
        if (div === null) {
            throw new Error(`could not find element with id "${id}"`);
        }
        this.div = div;
        let index = 0;
        for (const d of dialogue) {
            if (d.tag !== undefined) {
                if (this.nodes.has(d.tag)) {
                    throw new Error(`duplicate tag "${d.tag}"`);
                }
                this.nodes.set(d.tag, index);
            }
            index++;
        }
        const startIndex = this.nodes.get("start");
        this.curIndex = startIndex !== null && startIndex !== void 0 ? startIndex : 0;
        this.update();
    }
    templateToString(str) {
        if (typeof str === "string")
            return str;
        let ret = "";
        for (let i = 0; i < str.values.length; i++) {
            ret += str.sections[i] + str.values[i](this.store);
        }
        return ret + str.sections[str.sections.length - 1];
    }
    advance(tag) {
        if (tag === undefined) {
            this.curIndex++;
            if (this.curIndex >= this.dialogue.length) {
                throw new Error("current index advanced past end of dialogue");
            }
        }
        else {
            const str = typeof tag === "string" ? tag : tag(this.store);
            const nodeIndex = this.nodes.get(str);
            if (nodeIndex === undefined) {
                throw new Error(`could not find node with tag "${str}"`);
            }
            this.curIndex = nodeIndex;
        }
        const node = this.dialogue[this.curIndex];
        if (node.callback !== undefined)
            node.callback(this.store);
        this.update();
    }
    makeButton(choice) {
        const button = document.createElement("button");
        button.innerText = this.templateToString(choice.text);
        button.onclick = () => {
            if (choice.callback !== undefined)
                choice.callback(this.store);
            this.advance(choice.tag);
        };
        return button;
    }
    update() {
        removeAllChildNodes(this.div);
        const node = this.dialogue[this.curIndex];
        if (node.seed !== undefined && this.prevSeed !== node.seed) {
            const seed = typeof node.seed === "string" ? node.seed : node.seed(this.store);
            this.prevSeed = seed;
            this.artMaker.art(seed);
        }
        const p = document.createElement("p");
        p.innerText = this.templateToString(node.text);
        const buttons = node.choices
            .filter((n) => n.showIf === undefined || n.showIf(this.store))
            .map((n) => this.makeButton(n));
        this.div.appendChild(p);
        for (const b of buttons) {
            this.div.appendChild(b);
            this.div.innerHTML;
        }
    }
}
exports.DialogueManager = DialogueManager;

},{}],2:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const art_maker_1 = __importDefault(require("art-maker"));
const howler_1 = require("howler");
const dialogue_1 = require("./dialogue");
const artMaker = new art_maker_1.default(128);
//ijhxlzqt (seed for the alabaster white platform)
//mjfaivcm (cool swirl)
//yxcmyspo (calming baubles)
//tffpepaa (soft radial)
//sirfipcv (portal to green world)
//xhvlluag (swirly red)
//bvqrguwx (pink rising squares)
//zqfxjnru (bubbling lines)
//krvdqlql (harsh vignette with red center)
//kqnnhnju (blobby pink)
//lgudjfdv (neon displaced squares)
//fuhsoyip (dark boiling lines)
//vxxbkuya (dense line kaliedoscope)
//hnjlowce (bitmappy squares)
//zviirsak (colorful warping)
//iixxhnso (white red black distortion)
//lymkoqxu (red swirling)
//rmqhumlc (blue digital squares)
//owrzgxsq (carpet blue)
//snvpllrd (blue midi)
//iappagka (blue triangles)
//vlrtdoaf (darkened bit grid sides)
//uwmodqhf (crayon spiral)
//rczxhezc (zooming blue)
//fsfhnogn (flower)
//axxvygkv (mouse red spiral)
//yumtghwk (good for sea)
// sounds
const sounds = {
    voiceInHead: new howler_1.Howl({ src: ["../sounds/VoiceInHead.wav"], loop: true }),
    classicalMusic: new howler_1.Howl({
        src: ["../sounds/ClassicMusic-Waltz.wav"],
        loop: true,
    }),
    funkMusic: new howler_1.Howl({ src: "../sounds/FunkMusic.wav", loop: true }),
    rockMusic: new howler_1.Howl({ src: "../sounds/RockMusic.wav", loop: true }),
    surrealMusic: new howler_1.Howl({
        src: "../sounds/Surreal Environment BGM.wav",
        loop: true,
    }),
    calmMusic: new howler_1.Howl({
        src: "../sounds/CalmMusicWhileParagliding.wav",
        loop: true,
    }),
    rushingWind: new howler_1.Howl({
        src: "../sounds/RushingWind.mp3",
        loop: true,
    }),
    doorOpen: new howler_1.Howl({ src: "../sounds/DoorOpenSound.wav" }),
    breathCalmDown: new howler_1.Howl({ src: "../sounds/BreathCalmDown.wav" }),
    hospitalRoom: new howler_1.Howl({
        src: "../sounds/HospitalLoopSound.mp3",
        loop: true,
    }),
    explosion: new howler_1.Howl({ src: "../sounds/Explosion.wav" }),
    pills: new howler_1.Howl({ src: "../sounds/PillsBottleSound.wav" }),
};
function stopAllSounds() {
    for (const prop in sounds) {
        const entry = sounds[prop];
        entry.stop();
    }
}
window.addEventListener("keydown", (e) => {
    if (e.key === "f") {
        const div = document.getElementById("art");
        if (div === null)
            throw new Error("art div was null");
        div.requestFullscreen();
    }
});
new dialogue_1.DialogueManager(artMaker, [
    {
        seed: "lprqtskk",
        text: "This is a prototype for the game Forward. It has some audio, so please make sure " +
            "you are playing with the volume on. Press 'f' to go fullscreen. Enjoy!",
        choices: [{ text: "continue" }],
    },
    {
        seed: "nticsibl",
        text: `You hear distant voices shouting. In your right ear, clearer now, you hear \
"Are you okay? Say something!"`,
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        seed: "xmxzafxl",
        callback: () => {
            stopAllSounds();
            sounds.calmMusic.play();
            sounds.rushingWind.play();
        },
        text: `Starting from the center of your vision, a mountainous vista comes into view. \
You are paragliding, wind rushing by your ears. You swerve gently left and \
right by pulling down on the side you desire to steer.`,
        choices: [
            {
                text: "look to mountains",
                tag: "look to mountains",
            },
            {
                text: "look down at ground",
                tag: "look at ground",
            },
        ],
    },
    {
        tag: "look to mountains",
        callback: (map) => {
            map.trauma--;
        },
        text: `Looking beyond the mountains, you are exhilarated and at peace all at the same time. \
You think to yourself that you have never felt freedom like this.`,
        choices: [
            {
                text: "continue",
                tag: "crash",
            },
        ],
    },
    {
        tag: "look at ground",
        callback: (map) => {
            map.trauma++;
        },
        text: `Your feeling of ease is impinged upon by taking notice of the great height you are flying at. \
You quickly avert your gaze and return to looking straight ahead.`,
        choices: [
            {
                text: "continue",
                tag: "crash",
            },
        ],
    },
    {
        seed: "jlqqjoej",
        callback: (map) => {
            sounds.calmMusic.stop();
        },
        tag: "crash",
        text: `Momentarily, a dark shadow obscures your vision. In the very next instant, you are \
plummeting towards the ground. You look up as you fall, catching sight of the pilot that collided with you.`,
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        text: `A figure in a green flying suit comes to your side. He seems as though he is trying \
to calm you down, but his voice is indistinct. You look to your right arm.`,
        choices: [
            {
                text: "try to clench your fist",
            },
        ],
    },
    {
        text: "Your pinky barely twitches. You lose consciousness.",
        choices: [
            {
                text: "continue",
            },
        ],
    },
    // platforming level
    {
        callback: () => {
            stopAllSounds();
            sounds.hospitalRoom.play();
            sounds.surrealMusic.play();
        },
        seed: "paswlgcc",
        text: `You wake up in a hospital room. You lift your head up slightly to get a better \
look at your surroundings. The room around you looks normal... mostly. There are a few strange details, \
slight shimmers in the corners of the room, and something's not quite right about that picture on the \
wall, and did the floor just move?`,
        choices: [
            {
                text: "examine strange phenomena",
                callback: (map) => {
                    map.trauma--;
                },
                tag: "examine phenomena",
            },
            {
                text: "ignore them",
                callback: (map) => {
                    map.trauma++;
                },
                tag: "ignore phenomena",
            },
        ],
    },
    {
        tag: "examine phenomena",
        text: `As you get up and approach these strange aberrations, they reveal themselves to be mere apparitions, \
fading back to normal as you approach. You are somewhat reassured by this.`,
        choices: [
            {
                text: "continue",
                tag: "first pills fall",
            },
        ],
    },
    {
        tag: "ignore phenomena",
        text: `As you intentionally shield your gaze from these unexplained occurrences, \
you can't shake that unsettling feeling they gave you when you first noticed them \
out of the corner of your eye.`,
        choices: [
            {
                text: "continue",
                tag: "first pills fall",
            },
        ],
    },
    {
        callback: () => {
            sounds.pills.play();
            setTimeout(() => sounds.doorOpen.play(), 1500);
        },
        tag: "first pills fall",
        text: `After a short while, a bottle of pills falls in front of you. \
You don't remember a lot, but you do know that pills are supposed to make you healthier. \
Diligently, you take them. As you do this, the door to the room swings open. Instead of seeing the \
opposite wall of the drab hallway, you see a path extending into a void. At the end of the path, \
you see a radiant circular platform shaped like the top half of an onion flipped upside-down.`,
        choices: [
            {
                text: "continue down the path",
                tag: "center platform",
            },
            {
                text: "close the door",
                tag: "door closed",
            },
        ],
    },
    {
        seed: "sirfipcv",
        callback: (map) => {
            map.trauma++;
        },
        tag: "door closed",
        text: `You reach for the door knob. As you grab it, the metal gloms around your hand, adhering \
almost like a massive droplet of water. You are pulled right through the door, and are thrust onto the \
path above the void. You turn around and pound helplessly on the now solid door before giving up and walking \
fearfully down the path.`,
        choices: [
            {
                text: "continue",
                tag: "center platform",
            },
        ],
    },
    {
        callback: (map) => {
            sounds.hospitalRoom.stop();
        },
        tag: "center platform",
        seed: "ijhxlzqt",
        text: "You stand in the center platform. It is alabaster white and incredibly ornate; " +
            "very fine geometric patterns radiate out from the center. Before you are another two paths.",
        choices: [
            {
                text: "go left",
                tag: "left path",
            },
            {
                text: "go right",
                tag: "right path",
            },
        ],
    },
    {
        tag: "left path",
        seed: "bvqrguwx",
        text: "You approach the end of the path and arrive at a door. You find yourself " +
            "in an unusually tall hospital room. At the center is a slow-moving " +
            "swarm of flying hospital beds.",
        choices: [
            {
                text: "attempt to climb the beds",
            },
        ],
    },
    {
        text: "You leap and clamber from bed to bed. Some move you in flat circles, and others float " +
            "up and down, taking you to new heights. Multiple times you nearly miss a jump or lose your footing. " +
            "At the very top of this treacherous climb, you find another bottle of pills suspended in midair. " +
            "One more leap and you might be able to reach it.",
        choices: [
            {
                text: "leap for the pills",
                callback: (map) => {
                    sounds.pills.play();
                    map.gotLeftPills = true;
                },
            },
        ],
    },
    {
        seed: "zqfxjnru",
        text: "As you grab the pills, all of the beds beneath you instantly vanish. You plummet. " +
            "As you hit the ground, your vision goes dark.",
        choices: [
            {
                text: "try to wake",
                tag: "center platform later",
            },
        ],
    },
    {
        seed: "gdkcrxml",
        tag: "right path",
        text: "You traverse the path which leads you to a door. Beyond the door is a long hospital hallway. " +
            "shadowy spectres of paragliders flit across the floor. The floor is falling away in places, " +
            "revealing the endless void below.",
        choices: [
            {
                text: "attempt to cross the hallway",
            },
        ],
    },
    {
        text: "You narrowly avoid the shadows and pits to reach the end of the hallway. " +
            "A bottle of pills is floating on a small platform just beyond the fragmented end " +
            "of the threacherous corridor.",
        choices: [
            {
                text: "leap for the pills",
                callback: (map) => {
                    map.gotRightPills = true;
                    sounds.pills.play();
                },
            },
        ],
    },
    {
        seed: "iixxhnso",
        text: "As you grab the pills, gravity shifts and you begin to fall back, back through the hallway. " +
            "Your vision goes black.",
        choices: [
            {
                text: "try to wake",
                tag: "center platform later",
            },
        ],
    },
    {
        callback: () => {
            sounds.rushingWind.play();
        },
        seed: "ijhxlzqt",
        tag: "center platform later",
        text: dialogue_1.template `You open your eyes and find that you are back at the white center platform above the void. \
    You have already gone the ${(map) => map.gotLeftPills && map.gotRightPills
            ? "left and right"
            : map.gotRightPills
                ? "right"
                : "left"} path. ${(map) => map.gotLeftPills && map.gotRightPills
            ? "In the space between both paths, fragmented pieces of the all-too-familiar hospital tiling " +
                "rise from the void to form stepping stones leading to a swirling ball of white light. " +
                "You can hear rushing wind in the distance."
            : ""}`,
        choices: [
            {
                showIf: (map) => !map.gotLeftPills,
                text: "go left",
                tag: "left path",
            },
            {
                showIf: (map) => !map.gotRightPills,
                text: "go right",
                tag: "right path",
            },
            {
                showIf: (map) => map.gotLeftPills && map.gotRightPills,
                text: "take the path",
            },
        ],
    },
    // clock level
    {
        callback: () => {
            stopAllSounds();
            sounds.hospitalRoom.play();
        },
        seed: "yxcmyspo",
        text: "Your eyes slowly come into focus, and you realize you are peering into the hospital from the outside. " +
            "You can see through the walls. Looking at the hospital in this way reminds you of a dollhouse.",
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        text: "Among the array of rooms \u2014 some with doctors, nurses, patients, some empty \u2014 " +
            "you find your own, and focus in on it. You see your own body, in your bed, unmoving, " +
            "as two doctors in white lab coats talk over it, one male and one female. Shortly, a nurse " +
            "in a green scrub walks in. She is soon followed by your parents. Your mother swiftly walks over to the bedside " +
            "and covers her mouth \u2014 an expression that could be either fear, relief, or a mix of both.",
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        text: "Your disembodied view of the scene moves in closer until you are in the room with the others, hovering low, " +
            "just above the height of the bedframe. You see yourself wake up and look around while shifting around " +
            "slightly. Your parents go between shouting with joy and trying to be quiet in order to not overwhelm you.",
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        //tag: "start",
        text: "For a moment, everything goes dark. In the next instant, you are in your own body once again. " +
            "You turn your head towards the alarm clock.",
        choices: [
            {
                text: "speak to the clock",
            },
        ],
    },
    {
        text: `"Hi"

    "Hello there," the clock responds.`,
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        seed: "bbhkopmy",
        text: `The blue LCD digits on the face rearrange to create a face with two eyes. "I've been watching you sleep."

      "Oh," you respond.`,
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        text: `"I \u2014 I'm not sure I know what's real anymore."

    "That sounds awful!" the clock replies. "Well, I can assure you that I'm real, if that is any help. "

    "Hmm\u2026." You are not sure that this is helpful.`,
        choices: [
            {
                text: `"I'm not so sure"`,
                tag: "not so sure real",
                callback: (map) => {
                    map.clockMood--;
                },
            },
            {
                text: `"Sure\u2026"`,
                tag: "clock what happened",
            },
        ],
    },
    {
        seed: "fakfrsab",
        tag: "not so sure real",
        text: `"Okay, that stings a bit," says the clock. "Quite frankly, I'm not too sure you're real either."`,
        choices: [
            {
                text: "continue",
                tag: "clock what happened",
            },
        ],
    },
    {
        seed: "iappagka",
        tag: "clock what happened",
        text: `"Do you know what happened?" asks the clock.

    "I was in the sky\u2026 I think\u2026 and I fell."

    "Youch, man." There is a pause. "Would some tunes help? I do love Chopin."`,
        choices: [
            {
                text: "play classical",
                tag: "classical music",
                callback: (map) => {
                    map.clockMood++;
                    map.musicChoice = "classical";
                    stopAllSounds();
                    sounds.classicalMusic.play();
                },
            },
            {
                text: "play rock",
                tag: "rock music",
                callback: (map) => {
                    map.clockMood--;
                    map.musicChoice = "rock";
                    stopAllSounds();
                    sounds.rockMusic.play();
                },
            },
            {
                text: "play funk",
                tag: "funk music",
                callback: (map) => {
                    map.clockMood -= 2;
                    map.musicChoice = "funk";
                    stopAllSounds();
                    sounds.funkMusic.play();
                },
            },
        ],
    },
    {
        tag: "classical music",
        seed: "snvpllrd",
        text: `"Wonderful! This is one of my favorites," the clock exclaims, seemingly satisfied.`,
        choices: [
            {
                text: "continue",
                tag: "after music",
            },
        ],
    },
    {
        tag: "rock music",
        seed: "hmmmriuq",
        text: `"Alright. Not exactly my scene, but I could get into this," says the clock.`,
        choices: [
            {
                text: "continue",
                tag: "after music",
            },
        ],
    },
    {
        tag: "funk music",
        seed: "waqgjphv",
        text: `"Really? No, sure, that's alright," mutters the clock. It seems irritated.`,
        choices: [
            {
                text: "continue",
                tag: "after music",
            },
        ],
    },
    {
        tag: "after music",
        text: dialogue_1.template `"Care to play a game to pass the time?" asks the clock. "How about an AI's favorite war game, tic-tac-toe?${(map) => map.musicChoice === "classical"
            ? ' This music is a perfect for a game of minds!"'
            : map.musicChoice === "funk"
                ? " Although, this grating music is going to make it a bit tricky to hone in on the correct play " +
                    'among the multitudes of strategic options."'
                : map.musicChoice === "rock"
                    ? " The rock music will have to do as a score to this battle of wits."
                    : ""}`,
        choices: [
            {
                text: "accept",
                tag: "accept game",
            },
            {
                text: "decline",
                tag: "decline game",
            },
        ],
    },
    {
        tag: "decline game",
        text: '"You\'re no fun at all," the clock whines.',
        choices: [
            {
                text: "continue",
                tag: "clock mad",
            },
        ],
    },
    {
        tag: "accept game",
        callback: (map) => {
            map.playerWentFirst = map.clockMood > 0;
        },
        text: dialogue_1.template `A tic-tac-toe board etches itself into the wall across from your bed.

    "${(map) => map.playerWentFirst ? "You" : "I'll"} go first," the clock says. \
    ${(map) => map.playerWentFirst
            ? "With your mind, you scratch"
            : "Without moving, the clock scratches"} the first X on the wall. ${(map) => map.playerWentFirst
            ? ""
            : "In response, you etch an O into the wall simply by thinking about where it will go."} \
"Strange game\u2026" you think to yourself.`,
        choices: [
            {
                text: "continue",
            },
        ],
    },
    {
        text: "Very soon, you notice the clock doesn't have much of a strategy. " +
            "It leaves you open to win the game in a single move.",
        choices: [
            {
                text: "play the winning move",
                tag: "you win game",
            },
            {
                text: "force a draw",
                tag: "you draw game",
            },
            {
                text: "throw the game",
                tag: "you lose game",
            },
        ],
    },
    {
        tag: "you lose game",
        text: '"First chess, then go, now tic-tac-toe! AI has truly mastered the domain of all games once ' +
            'thought to necessitate the creativity and critical thinking faculties of natural intelligence," ' +
            "the clock gloats.",
        choices: [
            {
                text: "continue",
                tag: "clock mad",
            },
        ],
        callback: (map) => {
            map.clockMood++;
        },
    },
    {
        tag: "you draw game",
        text: '"Well, that\'s a little bit of a boring outcome," the clock complains.',
        choices: [
            {
                text: "continue",
                tag: "clock mad",
            },
        ],
        callback: (map) => {
            map.clockMood--;
        },
    },
    {
        tag: "you win game",
        text: "\"That's not possible. Impossible! IMPOSSIBLE!\" The clock's voice grows deeper and louder.",
        choices: [
            {
                text: "continue",
                tag: "clock mad",
            },
        ],
        callback: (map) => {
            map.clockMood -= 2;
        },
    },
    {
        callback: () => {
            stopAllSounds();
            sounds.voiceInHead.play();
        },
        seed: "krvdqlql",
        tag: "clock mad",
        text: dialogue_1.template `The lights in the room slowly fade to a dim red. The face of the clock\
    displays the message in red digital lettering:

CALCULATION: ${(map) => "" + Math.max(-map.clockMood, 0.5) * 24} DEAD, \
${(map) => "" + Math.max(-map.clockMood, 0.5) * 38} INJURED

The clock announces in a deep, distorted voice:
"DETONATION IMMINENT. THIS IS YOUR FAULT."`,
        choices: [
            {
                text: "try to calm the clock",
                tag: "guess music",
            },
            {
                text: "smash it",
                tag: "smash clock",
            },
        ],
    },
    {
        seed: "yxwmmzen",
        tag: "smash clock",
        callback: (map) => {
            map.trauma += Math.max(2, -map.clockMood);
            stopAllSounds();
            sounds.explosion.play();
        },
        text: "The clock instantly detonates. You see a flash and then nothing at all.",
        choices: [
            {
                text: "continue",
                tag: "sea chapter",
            },
        ],
    },
    {
        seed: "evcvfuho",
        tag: "guess music",
        callback: (map) => {
            map.wrongAnswersAllowed = map.clockMood > 0 ? 1 : 0;
        },
        text: dialogue_1.template `"Please! Disarm the bomb! What has anyone done to deserve this?" You continue to plead.

"I'LL GIVE YOU A CHANCE. YOU'RE ALLOWED ${(map) => map.wrongAnswersAllowed === 1
            ? "ONE WRONG ANSWER."
            : "NO WRONG ANSWERS."} WHAT IS MY FAVORITE MUSIC GENRE?"`,
        choices: [
            {
                text: '"classical!"',
                callback: (map) => {
                    map.correctAnswers++;
                },
            },
            {
                text: '"rock!"',
            },
            {
                text: '"funk!"',
            },
        ],
    },
    {
        seed: "ydhgvalo",
        tag: "guess movie",
        text: `"WHAT'S MY FAVORITE MOVIE FEATURING A CORRUPT AI?"`,
        choices: [
            {
                text: '"2001: A Space Odyssey!"',
            },
            {
                text: '"WarGames!"',
                callback: (map) => {
                    map.correctAnswers++;
                },
            },
            {
                text: '"I, Robot!"',
            },
        ],
    },
    {
        seed: "ksceuxwq",
        tag: "guess tic-tac-toe",
        text: '"WHO WENT FIRST WHEN WE PLAYED OUR GAME OF TIC-TAC-TOE?"',
        choices: [
            {
                text: '"You!"',
                callback: (map) => {
                    if (!map.playerWentFirst)
                        map.correctAnswers++;
                },
            },
            {
                text: '"Me!"',
                callback: (map) => {
                    if (map.playerWentFirst)
                        map.correctAnswers++;
                },
            },
        ],
    },
    {
        tag: "quiz results",
        callback: (map) => {
            map.quizPassed = 3 - map.correctAnswers <= map.wrongAnswersAllowed;
        },
        text: dialogue_1.template `"YOU HAVE GOTTEN ${(map) => "" + map.correctAnswers}/3 ANSWERS CORRECT. \
THIS IS ${(map) => (map.quizPassed ? "" : "NOT")} SUFFICIENT."`,
        choices: [
            {
                text: "continue",
                tag: (map) => map.quizPassed ? "clock calm chance" : "running around",
            },
        ],
    },
    {
        tag: "clock calm chance",
        callback: (map) => {
            map.bombSurvivalPercent = Math.floor(1 + 100 * Math.min(Math.max((3 + map.clockMood) / 7, 0.1), 0.9));
        },
        text: dialogue_1.template `"I LEAVE FATE UP TO CHANCE. BASED ON YOUR PREVIOUS ACTIONS, \
I CHOOSE YOUR CHANCE OF DISARMAMENT TO BE ${(map) => "" + map.bombSurvivalPercent}%"`,
        choices: [
            {
                text: "take those chances",
            },
        ],
    },
    {
        callback: (map) => {
            map.roll = Math.floor(Math.random() * 100);
            const str = ("" + map.roll).padStart(2, "0");
            map.tensRoll = str[0] + "0";
            map.onesRoll = str[1];
            map.survivedBomb = map.roll < map.bombSurvivalPercent;
        },
        text: dialogue_1.template `"YOU MUST ROLL BELOW ${(map) => "" + map.bombSurvivalPercent} TO SURVIVE."

A d100 pair of dice appear on the face of the clock. The first one spins, \
stops, landing on ${(map) => "" + map.tensRoll}. The second die lands on ${(map) => "" + map.onesRoll}.

"YOU ROLLED A ${(map) => "" + map.roll}. ${(map) => map.survivedBomb ? "YOU'RE LUCKY." : "NO SUCH LUCK."}"`,
        choices: [
            {
                text: "continue",
                tag: (map) => map.survivedBomb ? "disarm bomb" : "running around",
            },
        ],
    },
    {
        callback: () => {
            stopAllSounds();
        },
        seed: "cfqnpmme",
        tag: "disarm bomb",
        text: `You reach out to hit the snooze button on the clock. The lighting in the room \
returns to a normal hue and the face of the clock once again tells time: 12:15 PM.`,
        choices: [{ text: "continue", tag: "sea chapter" }],
    },
    {
        callback: (map) => {
            map.trauma += Math.max(1, -map.clockMood + 2);
            stopAllSounds();
            sounds.explosion.play();
        },
        seed: "yxwmmzen",
        tag: "running around",
        text: `The face of the clock rolls over to a one minute timer, beeping \
as each second passes. You leap out of your bed and sprint through the hallway, pounding \
on doors trying to warn anyone at all\u2026 to no avail. The timer ends and after a short \
pause you hear a loud crash and see a flash of light. And then, nothing.`,
        choices: [{ text: "continue", tag: "sea chapter" }],
    },
    {
        seed: "kdugqbly",
        tag: "sea chapter",
        callback: () => {
            stopAllSounds();
            sounds.calmMusic.play();
            sounds.rushingWind.play();
        },
        text: dialogue_1.template `${(map) => !map.survivedBomb
            ? "You wake up in your bed."
            : ""} The hospital room around \
you falls away. You find yourself on the deck of a pirate ship in a vast sea. A captain in a tricorn hat \
greets you.

"Arrr, the landlubber wakes!"`,
        choices: [
            {
                text: '"Who are you?"',
            },
        ],
    },
    {
        text: `"Ye have not heard tales o' me? I'm Captain Doctor Skullduggery, Scourge of the Sea, M.D.! \
I've been takin' care of ye, overseein' yer recovery!"`,
        choices: [
            {
                text: '"What\'s that up ahead?"',
            },
        ],
    },
    {
        callback: (map) => {
            map.safePassage = map.trauma < 2;
        },
        text: dialogue_1.template `"That's the terrible passage of terror and trauma! The more trauma, both physical and mental, ye \
had the misfortune of accumulatin' over the the course of this here voyage to recovery, the more perilous \
it will be."

${(map) => map.safePassage
            ? "The passage is scattered with a few rocks."
            : "The passage is a perilous gauntlet of jagged rocks and spires."} Beyond it is an array of double doors, familiar to you \
as the exit of the intensive care unit.

"Climb up to the lookout when yer ready to forge ahead. I'll be at the bow."`,
        choices: [
            {
                text: "climb to the lookout",
            },
        ],
    },
    {
        text: `"Full speed ahead!" you shout from the lookout.

"Aye, aye!" shouts the captain. The ship picks up speed, barreling towards the passage.`,
        choices: [
            {
                text: "continue",
                tag: (map) => (map.safePassage ? "escape" : "drown"),
            },
        ],
    },
    {
        seed: "tffpepaa",
        tag: "escape",
        text: `The boat narrowly misses the scattered obstacles. You make it towards the hospital exit, \
which seems much larger than before. The doors slowly open, emitting a brilliant light.

This is the end of your journey.`,
        choices: [],
    },
    {
        callback: () => {
            stopAllSounds();
            sounds.voiceInHead.play();
        },
        seed: "yumtghwk",
        tag: "drown",
        text: dialogue_1.template `Your eyes are focused on the doors, which grow more ghostly as you approach. \
Suddenly, the ${() => Math.random() < 0.5
            ? "port"
            : "starboard"} side of your ship clips a jagged \
spire. The deck splinters and crumbles, dropping you into the cold, tumultuous sea. Struggling, you sink \
deeper and deeper.

This is the end of your journey\u2026`,
        choices: [],
    },
]);

},{"./dialogue":1,"art-maker":10,"howler":4}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
(function (global){(function (){
/*!
 *  howler.js v2.2.0
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  var HowlerGlobal = function() {
    this.init();
  };
  HowlerGlobal.prototype = {
    /**
     * Initialize the global Howler object.
     * @return {Howler}
     */
    init: function() {
      var self = this || Howler;

      // Create a global ID counter.
      self._counter = 1000;

      // Pool of unlocked HTML5 Audio objects.
      self._html5AudioPool = [];
      self.html5PoolSize = 10;

      // Internal properties.
      self._codecs = {};
      self._howls = [];
      self._muted = false;
      self._volume = 1;
      self._canPlayEvent = 'canplaythrough';
      self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

      // Public properties.
      self.masterGain = null;
      self.noAudio = false;
      self.usingWebAudio = true;
      self.autoSuspend = true;
      self.ctx = null;

      // Set to false to disable the auto audio unlocker.
      self.autoUnlock = true;

      // Setup the various state values for global tracking.
      self._setup();

      return self;
    },

    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this || Howler;
      vol = parseFloat(vol);

      // If we don't have an AudioContext created yet, run the setup.
      if (!self.ctx) {
        setupAudioContext();
      }

      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        self._volume = vol;

        // Don't update any of the nodes if we are muted.
        if (self._muted) {
          return self;
        }

        // When using Web Audio, we just need to adjust the master gain.
        if (self.usingWebAudio) {
          self.masterGain.gain.setValueAtTime(vol, Howler.ctx.currentTime);
        }

        // Loop through and change volume for all HTML5 audio nodes.
        for (var i=0; i<self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            // Get all of the sounds in this Howl group.
            var ids = self._howls[i]._getSoundIds();

            // Loop through all sounds and change the volumes.
            for (var j=0; j<ids.length; j++) {
              var sound = self._howls[i]._soundById(ids[j]);

              if (sound && sound._node) {
                sound._node.volume = sound._volume * vol;
              }
            }
          }
        }

        return self;
      }

      return self._volume;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    mute: function(muted) {
      var self = this || Howler;

      // If we don't have an AudioContext created yet, run the setup.
      if (!self.ctx) {
        setupAudioContext();
      }

      self._muted = muted;

      // With Web Audio, we just need to mute the master gain.
      if (self.usingWebAudio) {
        self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx.currentTime);
      }

      // Loop through and mute all HTML5 Audio nodes.
      for (var i=0; i<self._howls.length; i++) {
        if (!self._howls[i]._webAudio) {
          // Get all of the sounds in this Howl group.
          var ids = self._howls[i]._getSoundIds();

          // Loop through all sounds and mark the audio node as muted.
          for (var j=0; j<ids.length; j++) {
            var sound = self._howls[i]._soundById(ids[j]);

            if (sound && sound._node) {
              sound._node.muted = (muted) ? true : sound._muted;
            }
          }
        }
      }

      return self;
    },

    /**
     * Handle stopping all sounds globally.
     */
    stop: function() {
      var self = this || Howler;

      // Loop through all Howls and stop them.
      for (var i=0; i<self._howls.length; i++) {
        self._howls[i].stop();
      }

      return self;
    },

    /**
     * Unload and destroy all currently loaded Howl objects.
     * @return {Howler}
     */
    unload: function() {
      var self = this || Howler;

      for (var i=self._howls.length-1; i>=0; i--) {
        self._howls[i].unload();
      }

      // Create a new AudioContext to make sure it is fully reset.
      if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
        self.ctx.close();
        self.ctx = null;
        setupAudioContext();
      }

      return self;
    },

    /**
     * Check for codec support of specific extension.
     * @param  {String} ext Audio file extention.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return (this || Howler)._codecs[ext.replace(/^x-/, '')];
    },

    /**
     * Setup various state values for global tracking.
     * @return {Howler}
     */
    _setup: function() {
      var self = this || Howler;

      // Keeps track of the suspend/resume state of the AudioContext.
      self.state = self.ctx ? self.ctx.state || 'suspended' : 'suspended';

      // Automatically begin the 30-second suspend process
      self._autoSuspend();

      // Check if audio is available.
      if (!self.usingWebAudio) {
        // No audio is available on this system if noAudio is set to true.
        if (typeof Audio !== 'undefined') {
          try {
            var test = new Audio();

            // Check if the canplaythrough event is available.
            if (typeof test.oncanplaythrough === 'undefined') {
              self._canPlayEvent = 'canplay';
            }
          } catch(e) {
            self.noAudio = true;
          }
        } else {
          self.noAudio = true;
        }
      }

      // Test to make sure audio isn't disabled in Internet Explorer.
      try {
        var test = new Audio();
        if (test.muted) {
          self.noAudio = true;
        }
      } catch (e) {}

      // Check for supported codecs.
      if (!self.noAudio) {
        self._setupCodecs();
      }

      return self;
    },

    /**
     * Check for browser support for various codecs and cache the results.
     * @return {Howler}
     */
    _setupCodecs: function() {
      var self = this || Howler;
      var audioTest = null;

      // Must wrap in a try/catch because IE11 in server mode throws an error.
      try {
        audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
      } catch (err) {
        return self;
      }

      if (!audioTest || typeof audioTest.canPlayType !== 'function') {
        return self;
      }

      var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');

      // Opera version <33 has mixed MP3 support, so we need to check for and block it.
      var checkOpera = self._navigator && self._navigator.userAgent.match(/OPR\/([0-6].)/g);
      var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);

      self._codecs = {
        mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
        mpeg: !!mpegTest,
        opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
        ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
        wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
        aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
        caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
        m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        m4b: !!(audioTest.canPlayType('audio/x-m4b;') || audioTest.canPlayType('audio/m4b;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
        weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
        webm: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, ''),
        dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
        flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
      };

      return self;
    },

    /**
     * Some browsers/devices will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _unlockAudio: function() {
      var self = this || Howler;

      // Only run this if Web Audio is supported and it hasn't already been unlocked.
      if (self._audioUnlocked || !self.ctx) {
        return;
      }

      self._audioUnlocked = false;
      self.autoUnlock = false;

      // Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
      // Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
      // By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
      if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
        self._mobileUnloaded = true;
        self.unload();
      }

      // Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
      // http://stackoverflow.com/questions/24119684
      self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);

      // Call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS, Android, etc.
      var unlock = function(e) {
        // Create a pool of unlocked HTML5 Audio objects that can
        // be used for playing sounds without user interaction. HTML5
        // Audio objects must be individually unlocked, as opposed
        // to the WebAudio API which only needs a single activation.
        // This must occur before WebAudio setup or the source.onended
        // event will not fire.
        while (self._html5AudioPool.length < self.html5PoolSize) {
          try {
            var audioNode = new Audio();

            // Mark this Audio object as unlocked to ensure it can get returned
            // to the unlocked pool when released.
            audioNode._unlocked = true;

            // Add the audio node to the pool.
            self._releaseHtml5Audio(audioNode);
          } catch (e) {
            self.noAudio = true;
            break;
          }
        }

        // Loop through any assigned audio nodes and unlock them.
        for (var i=0; i<self._howls.length; i++) {
          if (!self._howls[i]._webAudio) {
            // Get all of the sounds in this Howl group.
            var ids = self._howls[i]._getSoundIds();

            // Loop through all sounds and unlock the audio nodes.
            for (var j=0; j<ids.length; j++) {
              var sound = self._howls[i]._soundById(ids[j]);

              if (sound && sound._node && !sound._node._unlocked) {
                sound._node._unlocked = true;
                sound._node.load();
              }
            }
          }
        }

        // Fix Android can not play in suspend state.
        self._autoResume();

        // Create an empty buffer.
        var source = self.ctx.createBufferSource();
        source.buffer = self._scratchBuffer;
        source.connect(self.ctx.destination);

        // Play the empty buffer.
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
        if (typeof self.ctx.resume === 'function') {
          self.ctx.resume();
        }

        // Setup a timeout to check that we are unlocked on the next event loop.
        source.onended = function() {
          source.disconnect(0);

          // Update the unlocked state and prevent this check from happening again.
          self._audioUnlocked = true;

          // Remove the touch start listener.
          document.removeEventListener('touchstart', unlock, true);
          document.removeEventListener('touchend', unlock, true);
          document.removeEventListener('click', unlock, true);

          // Let all sounds know that audio has been unlocked.
          for (var i=0; i<self._howls.length; i++) {
            self._howls[i]._emit('unlock');
          }
        };
      };

      // Setup a touch start listener to attempt an unlock in.
      document.addEventListener('touchstart', unlock, true);
      document.addEventListener('touchend', unlock, true);
      document.addEventListener('click', unlock, true);

      return self;
    },

    /**
     * Get an unlocked HTML5 Audio object from the pool. If none are left,
     * return a new Audio object and throw a warning.
     * @return {Audio} HTML5 Audio object.
     */
    _obtainHtml5Audio: function() {
      var self = this || Howler;

      // Return the next object from the pool if one exists.
      if (self._html5AudioPool.length) {
        return self._html5AudioPool.pop();
      }

      //.Check if the audio is locked and throw a warning.
      var testPlay = new Audio().play();
      if (testPlay && typeof Promise !== 'undefined' && (testPlay instanceof Promise || typeof testPlay.then === 'function')) {
        testPlay.catch(function() {
          console.warn('HTML5 Audio pool exhausted, returning potentially locked audio object.');
        });
      }

      return new Audio();
    },

    /**
     * Return an activated HTML5 Audio object to the pool.
     * @return {Howler}
     */
    _releaseHtml5Audio: function(audio) {
      var self = this || Howler;

      // Don't add audio to the pool if we don't know if it has been unlocked.
      if (audio._unlocked) {
        self._html5AudioPool.push(audio);
      }

      return self;
    },

    /**
     * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
     * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
     * @return {Howler}
     */
    _autoSuspend: function() {
      var self = this;

      if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
        return;
      }

      // Check if any sounds are playing.
      for (var i=0; i<self._howls.length; i++) {
        if (self._howls[i]._webAudio) {
          for (var j=0; j<self._howls[i]._sounds.length; j++) {
            if (!self._howls[i]._sounds[j]._paused) {
              return self;
            }
          }
        }
      }

      if (self._suspendTimer) {
        clearTimeout(self._suspendTimer);
      }

      // If no sound has played after 30 seconds, suspend the context.
      self._suspendTimer = setTimeout(function() {
        if (!self.autoSuspend) {
          return;
        }

        self._suspendTimer = null;
        self.state = 'suspending';

        // Handle updating the state of the audio context after suspending.
        var handleSuspension = function() {
          self.state = 'suspended';

          if (self._resumeAfterSuspend) {
            delete self._resumeAfterSuspend;
            self._autoResume();
          }
        };

        // Either the state gets suspended or it is interrupted.
        // Either way, we need to update the state to suspended.
        self.ctx.suspend().then(handleSuspension, handleSuspension);
      }, 30000);

      return self;
    },

    /**
     * Automatically resume the Web Audio AudioContext when a new sound is played.
     * @return {Howler}
     */
    _autoResume: function() {
      var self = this;

      if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
        return;
      }

      if (self.state === 'running' && self.ctx.state !== 'interrupted' && self._suspendTimer) {
        clearTimeout(self._suspendTimer);
        self._suspendTimer = null;
      } else if (self.state === 'suspended' || self.state === 'running' && self.ctx.state === 'interrupted') {
        self.ctx.resume().then(function() {
          self.state = 'running';

          // Emit to all Howls that the audio has resumed.
          for (var i=0; i<self._howls.length; i++) {
            self._howls[i]._emit('resume');
          }
        });

        if (self._suspendTimer) {
          clearTimeout(self._suspendTimer);
          self._suspendTimer = null;
        }
      } else if (self.state === 'suspending') {
        self._resumeAfterSuspend = true;
      }

      return self;
    }
  };

  // Setup the global audio controller.
  var Howler = new HowlerGlobal();

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Create an audio group controller.
   * @param {Object} o Passed in properties for this group.
   */
  var Howl = function(o) {
    var self = this;

    // Throw an error if no source is provided.
    if (!o.src || o.src.length === 0) {
      console.error('An array of source files must be passed with any new Howl.');
      return;
    }

    self.init(o);
  };
  Howl.prototype = {
    /**
     * Initialize a new Howl group object.
     * @param  {Object} o Passed in properties for this group.
     * @return {Howl}
     */
    init: function(o) {
      var self = this;

      // If we don't have an AudioContext created yet, run the setup.
      if (!Howler.ctx) {
        setupAudioContext();
      }

      // Setup user-defined default properties.
      self._autoplay = o.autoplay || false;
      self._format = (typeof o.format !== 'string') ? o.format : [o.format];
      self._html5 = o.html5 || false;
      self._muted = o.mute || false;
      self._loop = o.loop || false;
      self._pool = o.pool || 5;
      self._preload = (typeof o.preload === 'boolean' || o.preload === 'metadata') ? o.preload : true;
      self._rate = o.rate || 1;
      self._sprite = o.sprite || {};
      self._src = (typeof o.src !== 'string') ? o.src : [o.src];
      self._volume = o.volume !== undefined ? o.volume : 1;
      self._xhr = {
        method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
        headers: o.xhr && o.xhr.headers ? o.xhr.headers : null,
        withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
      };

      // Setup all other default properties.
      self._duration = 0;
      self._state = 'unloaded';
      self._sounds = [];
      self._endTimers = {};
      self._queue = [];
      self._playLock = false;

      // Setup event listeners.
      self._onend = o.onend ? [{fn: o.onend}] : [];
      self._onfade = o.onfade ? [{fn: o.onfade}] : [];
      self._onload = o.onload ? [{fn: o.onload}] : [];
      self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
      self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
      self._onpause = o.onpause ? [{fn: o.onpause}] : [];
      self._onplay = o.onplay ? [{fn: o.onplay}] : [];
      self._onstop = o.onstop ? [{fn: o.onstop}] : [];
      self._onmute = o.onmute ? [{fn: o.onmute}] : [];
      self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
      self._onrate = o.onrate ? [{fn: o.onrate}] : [];
      self._onseek = o.onseek ? [{fn: o.onseek}] : [];
      self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
      self._onresume = [];

      // Web Audio or HTML5 Audio?
      self._webAudio = Howler.usingWebAudio && !self._html5;

      // Automatically try to enable audio.
      if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
        Howler._unlockAudio();
      }

      // Keep track of this Howl group in the global controller.
      Howler._howls.push(self);

      // If they selected autoplay, add a play event to the load queue.
      if (self._autoplay) {
        self._queue.push({
          event: 'play',
          action: function() {
            self.play();
          }
        });
      }

      // Load the source file unless otherwise specified.
      if (self._preload && self._preload !== 'none') {
        self.load();
      }

      return self;
    },

    /**
     * Load the audio file.
     * @return {Howler}
     */
    load: function() {
      var self = this;
      var url = null;

      // If no audio is available, quit immediately.
      if (Howler.noAudio) {
        self._emit('loaderror', null, 'No audio support.');
        return;
      }

      // Make sure our source is in an array.
      if (typeof self._src === 'string') {
        self._src = [self._src];
      }

      // Loop through the sources and pick the first one that is compatible.
      for (var i=0; i<self._src.length; i++) {
        var ext, str;

        if (self._format && self._format[i]) {
          // If an extension was specified, use that instead.
          ext = self._format[i];
        } else {
          // Make sure the source is a string.
          str = self._src[i];
          if (typeof str !== 'string') {
            self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
            continue;
          }

          // Extract the file extension from the URL or base64 data URI.
          ext = /^data:audio\/([^;,]+);/i.exec(str);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          }
        }

        // Log a warning if no extension was found.
        if (!ext) {
          console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
        }

        // Check if this extension is available.
        if (ext && Howler.codecs(ext)) {
          url = self._src[i];
          break;
        }
      }

      if (!url) {
        self._emit('loaderror', null, 'No codec support for selected audio sources.');
        return;
      }

      self._src = url;
      self._state = 'loading';

      // If the hosting page is HTTPS and the source isn't,
      // drop down to HTML5 Audio to avoid Mixed Content errors.
      if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
        self._html5 = true;
        self._webAudio = false;
      }

      // Create a new sound object and add it to the pool.
      new Sound(self);

      // Load and decode the audio data for playback.
      if (self._webAudio) {
        loadBuffer(self);
      }

      return self;
    },

    /**
     * Play a sound or resume previous playback.
     * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Number}          Sound ID.
     */
    play: function(sprite, internal) {
      var self = this;
      var id = null;

      // Determine if a sprite, sound id or nothing was passed
      if (typeof sprite === 'number') {
        id = sprite;
        sprite = null;
      } else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
        // If the passed sprite doesn't exist, do nothing.
        return null;
      } else if (typeof sprite === 'undefined') {
        // Use the default sound sprite (plays the full audio length).
        sprite = '__default';

        // Check if there is a single paused sound that isn't ended.
        // If there is, play that sound. If not, continue as usual.
        if (!self._playLock) {
          var num = 0;
          for (var i=0; i<self._sounds.length; i++) {
            if (self._sounds[i]._paused && !self._sounds[i]._ended) {
              num++;
              id = self._sounds[i]._id;
            }
          }

          if (num === 1) {
            sprite = null;
          } else {
            id = null;
          }
        }
      }

      // Get the selected node, or get one from the pool.
      var sound = id ? self._soundById(id) : self._inactiveSound();

      // If the sound doesn't exist, do nothing.
      if (!sound) {
        return null;
      }

      // Select the sprite definition.
      if (id && !sprite) {
        sprite = sound._sprite || '__default';
      }

      // If the sound hasn't loaded, we must wait to get the audio's duration.
      // We also need to wait to make sure we don't run into race conditions with
      // the order of function calls.
      if (self._state !== 'loaded') {
        // Set the sprite value on this sound.
        sound._sprite = sprite;

        // Mark this sound as not ended in case another sound is played before this one loads.
        sound._ended = false;

        // Add the sound to the queue to be played on load.
        var soundId = sound._id;
        self._queue.push({
          event: 'play',
          action: function() {
            self.play(soundId);
          }
        });

        return soundId;
      }

      // Don't play the sound if an id was passed and it is already playing.
      if (id && !sound._paused) {
        // Trigger the play event, in order to keep iterating through queue.
        if (!internal) {
          self._loadQueue('play');
        }

        return sound._id;
      }

      // Make sure the AudioContext isn't suspended, and resume it if it is.
      if (self._webAudio) {
        Howler._autoResume();
      }

      // Determine how long to play for and where to start playing.
      var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
      var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);
      var timeout = (duration * 1000) / Math.abs(sound._rate);
      var start = self._sprite[sprite][0] / 1000;
      var stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
      sound._sprite = sprite;

      // Mark the sound as ended instantly so that this async playback
      // doesn't get grabbed by another call to play while this one waits to start.
      sound._ended = false;

      // Update the parameters of the sound.
      var setParams = function() {
        sound._paused = false;
        sound._seek = seek;
        sound._start = start;
        sound._stop = stop;
        sound._loop = !!(sound._loop || self._sprite[sprite][2]);
      };

      // End the sound instantly if seek is at the end.
      if (seek >= stop) {
        self._ended(sound);
        return;
      }

      // Begin the actual playback.
      var node = sound._node;
      if (self._webAudio) {
        // Fire this when the sound is ready to play to begin Web Audio playback.
        var playWebAudio = function() {
          self._playLock = false;
          setParams();
          self._refreshBuffer(sound);

          // Setup the playback params.
          var vol = (sound._muted || self._muted) ? 0 : sound._volume;
          node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
          sound._playStart = Howler.ctx.currentTime;

          // Play the sound using the supported method.
          if (typeof node.bufferSource.start === 'undefined') {
            sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
          } else {
            sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
          }

          // Start a new timer if none is present.
          if (timeout !== Infinity) {
            self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
          }

          if (!internal) {
            setTimeout(function() {
              self._emit('play', sound._id);
              self._loadQueue();
            }, 0);
          }
        };

        if (Howler.state === 'running' && Howler.ctx.state !== 'interrupted') {
          playWebAudio();
        } else {
          self._playLock = true;

          // Wait for the audio context to resume before playing.
          self.once('resume', playWebAudio);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      } else {
        // Fire this when the sound is ready to play to begin HTML5 Audio playback.
        var playHtml5 = function() {
          node.currentTime = seek;
          node.muted = sound._muted || self._muted || Howler._muted || node.muted;
          node.volume = sound._volume * Howler.volume();
          node.playbackRate = sound._rate;

          // Some browsers will throw an error if this is called without user interaction.
          try {
            var play = node.play();

            // Support older browsers that don't support promises, and thus don't have this issue.
            if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof play.then === 'function')) {
              // Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
              self._playLock = true;

              // Set param values immediately.
              setParams();

              // Releases the lock and executes queued actions.
              play
                .then(function() {
                  self._playLock = false;
                  node._unlocked = true;
                  if (!internal) {
                    self._emit('play', sound._id);
                    self._loadQueue();
                  }
                })
                .catch(function() {
                  self._playLock = false;
                  self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                    'on mobile devices and Chrome where playback was not within a user interaction.');

                  // Reset the ended and paused values.
                  sound._ended = true;
                  sound._paused = true;
                });
            } else if (!internal) {
              self._playLock = false;
              setParams();
              self._emit('play', sound._id);
              self._loadQueue();
            }

            // Setting rate before playing won't work in IE, so we set it again here.
            node.playbackRate = sound._rate;

            // If the node is still paused, then we can assume there was a playback issue.
            if (node.paused) {
              self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
                'on mobile devices and Chrome where playback was not within a user interaction.');
              return;
            }

            // Setup the end timer on sprites or listen for the ended event.
            if (sprite !== '__default' || sound._loop) {
              self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
            } else {
              self._endTimers[sound._id] = function() {
                // Fire ended on this audio node.
                self._ended(sound);

                // Clear this listener.
                node.removeEventListener('ended', self._endTimers[sound._id], false);
              };
              node.addEventListener('ended', self._endTimers[sound._id], false);
            }
          } catch (err) {
            self._emit('playerror', sound._id, err);
          }
        };

        // If this is streaming audio, make sure the src is set and load again.
        if (node.src === 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA') {
          node.src = self._src;
          node.load();
        }

        // Play immediately if ready, or wait for the 'canplaythrough'e vent.
        var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && Howler._navigator.isCocoonJS);
        if (node.readyState >= 3 || loadedNoReadyState) {
          playHtml5();
        } else {
          self._playLock = true;

          var listener = function() {
            // Begin playback.
            playHtml5();

            // Clear this listener.
            node.removeEventListener(Howler._canPlayEvent, listener, false);
          };
          node.addEventListener(Howler._canPlayEvent, listener, false);

          // Cancel the end timer.
          self._clearTimer(sound._id);
        }
      }

      return sound._id;
    },

    /**
     * Pause playback and save current position.
     * @param  {Number} id The sound ID (empty to pause all in group).
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'pause',
          action: function() {
            self.pause(id);
          }
        });

        return self;
      }

      // If no id is passed, get all ID's to be paused.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound && !sound._paused) {
          // Reset the seek position.
          sound._seek = self.seek(ids[i]);
          sound._rateSeek = 0;
          sound._paused = true;

          // Stop currently running fades.
          self._stopFade(ids[i]);

          if (sound._node) {
            if (self._webAudio) {
              // Make sure the sound has been created.
              if (!sound._node.bufferSource) {
                continue;
              }

              if (typeof sound._node.bufferSource.stop === 'undefined') {
                sound._node.bufferSource.noteOff(0);
              } else {
                sound._node.bufferSource.stop(0);
              }

              // Clean up the buffer source.
              self._cleanBuffer(sound._node);
            } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
              sound._node.pause();
            }
          }
        }

        // Fire the pause event, unless `true` is passed as the 2nd argument.
        if (!arguments[1]) {
          self._emit('pause', sound ? sound._id : null);
        }
      }

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {Number} id The sound ID (empty to stop all in group).
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Howl}
     */
    stop: function(id, internal) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to stop when capable.
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'stop',
          action: function() {
            self.stop(id);
          }
        });

        return self;
      }

      // If no id is passed, get all ID's to be stopped.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Clear the end timer.
        self._clearTimer(ids[i]);

        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          // Reset the seek position.
          sound._seek = sound._start || 0;
          sound._rateSeek = 0;
          sound._paused = true;
          sound._ended = true;

          // Stop currently running fades.
          self._stopFade(ids[i]);

          if (sound._node) {
            if (self._webAudio) {
              // Make sure the sound's AudioBufferSourceNode has been created.
              if (sound._node.bufferSource) {
                if (typeof sound._node.bufferSource.stop === 'undefined') {
                  sound._node.bufferSource.noteOff(0);
                } else {
                  sound._node.bufferSource.stop(0);
                }

                // Clean up the buffer source.
                self._cleanBuffer(sound._node);
              }
            } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
              sound._node.currentTime = sound._start || 0;
              sound._node.pause();

              // If this is a live stream, stop download once the audio is stopped.
              if (sound._node.duration === Infinity) {
                self._clearSound(sound._node);
              }
            }
          }

          if (!internal) {
            self._emit('stop', sound._id);
          }
        }
      }

      return self;
    },

    /**
     * Mute/unmute a single sound or all sounds in this Howl group.
     * @param  {Boolean} muted Set to true to mute and false to unmute.
     * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
     * @return {Howl}
     */
    mute: function(muted, id) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to mute when capable.
      if (self._state !== 'loaded'|| self._playLock) {
        self._queue.push({
          event: 'mute',
          action: function() {
            self.mute(muted, id);
          }
        });

        return self;
      }

      // If applying mute/unmute to all sounds, update the group's value.
      if (typeof id === 'undefined') {
        if (typeof muted === 'boolean') {
          self._muted = muted;
        } else {
          return self._muted;
        }
      }

      // If no id is passed, get all ID's to be muted.
      var ids = self._getSoundIds(id);

      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        if (sound) {
          sound._muted = muted;

          // Cancel active fade and set the volume to the end value.
          if (sound._interval) {
            self._stopFade(sound._id);
          }

          if (self._webAudio && sound._node) {
            sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx.currentTime);
          } else if (sound._node) {
            sound._node.muted = Howler._muted ? true : muted;
          }

          self._emit('mute', sound._id);
        }
      }

      return self;
    },

    /**
     * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
     *   volume() -> Returns the group's volume value.
     *   volume(id) -> Returns the sound id's current volume.
     *   volume(vol) -> Sets the volume of all sounds in this Howl group.
     *   volume(vol, id) -> Sets the volume of passed sound id.
     * @return {Howl/Number} Returns self or current volume.
     */
    volume: function() {
      var self = this;
      var args = arguments;
      var vol, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // Return the value of the groups' volume.
        return self._volume;
      } else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
        // First check if this is an ID, and if not, assume it is a new volume.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          vol = parseFloat(args[0]);
        }
      } else if (args.length >= 2) {
        vol = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // Update the volume or return the current volume.
      var sound;
      if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
        // If the sound hasn't loaded, add it to the load queue to change volume when capable.
        if (self._state !== 'loaded'|| self._playLock) {
          self._queue.push({
            event: 'volume',
            action: function() {
              self.volume.apply(self, args);
            }
          });

          return self;
        }

        // Set the group volume.
        if (typeof id === 'undefined') {
          self._volume = vol;
        }

        // Update one or all volumes.
        id = self._getSoundIds(id);
        for (var i=0; i<id.length; i++) {
          // Get the sound.
          sound = self._soundById(id[i]);

          if (sound) {
            sound._volume = vol;

            // Stop currently running fades.
            if (!args[2]) {
              self._stopFade(id[i]);
            }

            if (self._webAudio && sound._node && !sound._muted) {
              sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
            } else if (sound._node && !sound._muted) {
              sound._node.volume = vol * Howler.volume();
            }

            self._emit('volume', sound._id);
          }
        }
      } else {
        sound = id ? self._soundById(id) : self._sounds[0];
        return sound ? sound._volume : 0;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
     * @param  {Number} from The value to fade from (0.0 to 1.0).
     * @param  {Number} to   The volume to fade to (0.0 to 1.0).
     * @param  {Number} len  Time in milliseconds to fade.
     * @param  {Number} id   The sound id (omit to fade all sounds).
     * @return {Howl}
     */
    fade: function(from, to, len, id) {
      var self = this;

      // If the sound hasn't loaded, add it to the load queue to fade when capable.
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'fade',
          action: function() {
            self.fade(from, to, len, id);
          }
        });

        return self;
      }

      // Make sure the to/from/len values are numbers.
      from = Math.min(Math.max(0, parseFloat(from)), 1);
      to = Math.min(Math.max(0, parseFloat(to)), 1);
      len = parseFloat(len);

      // Set the volume to the start position.
      self.volume(from, id);

      // Fade the volume of one or all sounds.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        // Get the sound.
        var sound = self._soundById(ids[i]);

        // Create a linear fade or fall back to timeouts with HTML5 Audio.
        if (sound) {
          // Stop the previous fade if no sprite is being used (otherwise, volume handles this).
          if (!id) {
            self._stopFade(ids[i]);
          }

          // If we are using Web Audio, let the native methods do the actual fade.
          if (self._webAudio && !sound._muted) {
            var currentTime = Howler.ctx.currentTime;
            var end = currentTime + (len / 1000);
            sound._volume = from;
            sound._node.gain.setValueAtTime(from, currentTime);
            sound._node.gain.linearRampToValueAtTime(to, end);
          }

          self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
        }
      }

      return self;
    },

    /**
     * Starts the internal interval to fade a sound.
     * @param  {Object} sound Reference to sound to fade.
     * @param  {Number} from The value to fade from (0.0 to 1.0).
     * @param  {Number} to   The volume to fade to (0.0 to 1.0).
     * @param  {Number} len  Time in milliseconds to fade.
     * @param  {Number} id   The sound id to fade.
     * @param  {Boolean} isGroup   If true, set the volume on the group.
     */
    _startFadeInterval: function(sound, from, to, len, id, isGroup) {
      var self = this;
      var vol = from;
      var diff = to - from;
      var steps = Math.abs(diff / 0.01);
      var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
      var lastTick = Date.now();

      // Store the value being faded to.
      sound._fadeTo = to;

      // Update the volume value on each interval tick.
      sound._interval = setInterval(function() {
        // Update the volume based on the time since the last tick.
        var tick = (Date.now() - lastTick) / len;
        lastTick = Date.now();
        vol += diff * tick;

        // Make sure the volume is in the right bounds.
        if (diff < 0) {
          vol = Math.max(to, vol);
        } else {
          vol = Math.min(to, vol);
        }

        // Round to within 2 decimal points.
        vol = Math.round(vol * 100) / 100;

        // Change the volume.
        if (self._webAudio) {
          sound._volume = vol;
        } else {
          self.volume(vol, sound._id, true);
        }

        // Set the group's volume.
        if (isGroup) {
          self._volume = vol;
        }

        // When the fade is complete, stop it and fire event.
        if ((to < from && vol <= to) || (to > from && vol >= to)) {
          clearInterval(sound._interval);
          sound._interval = null;
          sound._fadeTo = null;
          self.volume(to, sound._id);
          self._emit('fade', sound._id);
        }
      }, stepLen);
    },

    /**
     * Internal method that stops the currently playing fade when
     * a new fade starts, volume is changed or the sound is stopped.
     * @param  {Number} id The sound id.
     * @return {Howl}
     */
    _stopFade: function(id) {
      var self = this;
      var sound = self._soundById(id);

      if (sound && sound._interval) {
        if (self._webAudio) {
          sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
        }

        clearInterval(sound._interval);
        sound._interval = null;
        self.volume(sound._fadeTo, id);
        sound._fadeTo = null;
        self._emit('fade', id);
      }

      return self;
    },

    /**
     * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
     *   loop() -> Returns the group's loop value.
     *   loop(id) -> Returns the sound id's loop value.
     *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
     *   loop(loop, id) -> Sets the loop value of passed sound id.
     * @return {Howl/Boolean} Returns self or current loop value.
     */
    loop: function() {
      var self = this;
      var args = arguments;
      var loop, id, sound;

      // Determine the values for loop and id.
      if (args.length === 0) {
        // Return the grou's loop value.
        return self._loop;
      } else if (args.length === 1) {
        if (typeof args[0] === 'boolean') {
          loop = args[0];
          self._loop = loop;
        } else {
          // Return this sound's loop value.
          sound = self._soundById(parseInt(args[0], 10));
          return sound ? sound._loop : false;
        }
      } else if (args.length === 2) {
        loop = args[0];
        id = parseInt(args[1], 10);
      }

      // If no id is passed, get all ID's to be looped.
      var ids = self._getSoundIds(id);
      for (var i=0; i<ids.length; i++) {
        sound = self._soundById(ids[i]);

        if (sound) {
          sound._loop = loop;
          if (self._webAudio && sound._node && sound._node.bufferSource) {
            sound._node.bufferSource.loop = loop;
            if (loop) {
              sound._node.bufferSource.loopStart = sound._start || 0;
              sound._node.bufferSource.loopEnd = sound._stop;
            }
          }
        }
      }

      return self;
    },

    /**
     * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   rate() -> Returns the first sound node's current playback rate.
     *   rate(id) -> Returns the sound id's current playback rate.
     *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
     *   rate(rate, id) -> Sets the playback rate of passed sound id.
     * @return {Howl/Number} Returns self or the current playback rate.
     */
    rate: function() {
      var self = this;
      var args = arguments;
      var rate, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // We will simply return the current rate of the first node.
        id = self._sounds[0]._id;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new rate value.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else {
          rate = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        rate = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // Update the playback rate or return the current value.
      var sound;
      if (typeof rate === 'number') {
        // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
        if (self._state !== 'loaded' || self._playLock) {
          self._queue.push({
            event: 'rate',
            action: function() {
              self.rate.apply(self, args);
            }
          });

          return self;
        }

        // Set the group rate.
        if (typeof id === 'undefined') {
          self._rate = rate;
        }

        // Update one or all volumes.
        id = self._getSoundIds(id);
        for (var i=0; i<id.length; i++) {
          // Get the sound.
          sound = self._soundById(id[i]);

          if (sound) {
            // Keep track of our position when the rate changed and update the playback
            // start position so we can properly adjust the seek position for time elapsed.
            if (self.playing(id[i])) {
              sound._rateSeek = self.seek(id[i]);
              sound._playStart = self._webAudio ? Howler.ctx.currentTime : sound._playStart;
            }
            sound._rate = rate;

            // Change the playback rate.
            if (self._webAudio && sound._node && sound._node.bufferSource) {
              sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler.ctx.currentTime);
            } else if (sound._node) {
              sound._node.playbackRate = rate;
            }

            // Reset the timers.
            var seek = self.seek(id[i]);
            var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
            var timeout = (duration * 1000) / Math.abs(sound._rate);

            // Start a new end timer if sound is already playing.
            if (self._endTimers[id[i]] || !sound._paused) {
              self._clearTimer(id[i]);
              self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
            }

            self._emit('rate', sound._id);
          }
        }
      } else {
        sound = self._soundById(id);
        return sound ? sound._rate : self._rate;
      }

      return self;
    },

    /**
     * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
     *   seek() -> Returns the first sound node's current seek position.
     *   seek(id) -> Returns the sound id's current seek position.
     *   seek(seek) -> Sets the seek position of the first sound node.
     *   seek(seek, id) -> Sets the seek position of passed sound id.
     * @return {Howl/Number} Returns self or the current seek position.
     */
    seek: function() {
      var self = this;
      var args = arguments;
      var seek, id;

      // Determine the values based on arguments.
      if (args.length === 0) {
        // We will simply return the current position of the first node.
        id = self._sounds[0]._id;
      } else if (args.length === 1) {
        // First check if this is an ID, and if not, assume it is a new seek position.
        var ids = self._getSoundIds();
        var index = ids.indexOf(args[0]);
        if (index >= 0) {
          id = parseInt(args[0], 10);
        } else if (self._sounds.length) {
          id = self._sounds[0]._id;
          seek = parseFloat(args[0]);
        }
      } else if (args.length === 2) {
        seek = parseFloat(args[0]);
        id = parseInt(args[1], 10);
      }

      // If there is no ID, bail out.
      if (typeof id === 'undefined') {
        return self;
      }

      // If the sound hasn't loaded, add it to the load queue to seek when capable.
      if (self._state !== 'loaded' || self._playLock) {
        self._queue.push({
          event: 'seek',
          action: function() {
            self.seek.apply(self, args);
          }
        });

        return self;
      }

      // Get the sound.
      var sound = self._soundById(id);

      if (sound) {
        if (typeof seek === 'number' && seek >= 0) {
          // Pause the sound and update position for restarting playback.
          var playing = self.playing(id);
          if (playing) {
            self.pause(id, true);
          }

          // Move the position of the track and cancel timer.
          sound._seek = seek;
          sound._ended = false;
          self._clearTimer(id);

          // Update the seek position for HTML5 Audio.
          if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
            sound._node.currentTime = seek;
          }

          // Seek and emit when ready.
          var seekAndEmit = function() {
            self._emit('seek', id);

            // Restart the playback if the sound was playing.
            if (playing) {
              self.play(id, true);
            }
          };

          // Wait for the play lock to be unset before emitting (HTML5 Audio).
          if (playing && !self._webAudio) {
            var emitSeek = function() {
              if (!self._playLock) {
                seekAndEmit();
              } else {
                setTimeout(emitSeek, 0);
              }
            };
            setTimeout(emitSeek, 0);
          } else {
            seekAndEmit();
          }
        } else {
          if (self._webAudio) {
            var realTime = self.playing(id) ? Howler.ctx.currentTime - sound._playStart : 0;
            var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
            return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
          } else {
            return sound._node.currentTime;
          }
        }
      }

      return self;
    },

    /**
     * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
     * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
     * @return {Boolean} True if playing and false if not.
     */
    playing: function(id) {
      var self = this;

      // Check the passed sound ID (if any).
      if (typeof id === 'number') {
        var sound = self._soundById(id);
        return sound ? !sound._paused : false;
      }

      // Otherwise, loop through all sounds and check if any are playing.
      for (var i=0; i<self._sounds.length; i++) {
        if (!self._sounds[i]._paused) {
          return true;
        }
      }

      return false;
    },

    /**
     * Get the duration of this sound. Passing a sound id will return the sprite duration.
     * @param  {Number} id The sound id to check. If none is passed, return full source duration.
     * @return {Number} Audio duration in seconds.
     */
    duration: function(id) {
      var self = this;
      var duration = self._duration;

      // If we pass an ID, get the sound and return the sprite length.
      var sound = self._soundById(id);
      if (sound) {
        duration = self._sprite[sound._sprite][1] / 1000;
      }

      return duration;
    },

    /**
     * Returns the current loaded state of this Howl.
     * @return {String} 'unloaded', 'loading', 'loaded'
     */
    state: function() {
      return this._state;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all sound instances attached to this group.
     */
    unload: function() {
      var self = this;

      // Stop playing any active sounds.
      var sounds = self._sounds;
      for (var i=0; i<sounds.length; i++) {
        // Stop the sound if it is currently playing.
        if (!sounds[i]._paused) {
          self.stop(sounds[i]._id);
        }

        // Remove the source or disconnect.
        if (!self._webAudio) {
          // Set the source to 0-second silence to stop any downloading (except in IE).
          self._clearSound(sounds[i]._node);

          // Remove any event listeners.
          sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
          sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);

          // Release the Audio object back to the pool.
          Howler._releaseHtml5Audio(sounds[i]._node);
        }

        // Empty out all of the nodes.
        delete sounds[i]._node;

        // Make sure all timers are cleared out.
        self._clearTimer(sounds[i]._id);
      }

      // Remove the references in the global Howler object.
      var index = Howler._howls.indexOf(self);
      if (index >= 0) {
        Howler._howls.splice(index, 1);
      }

      // Delete this sound from the cache (if no other Howl is using it).
      var remCache = true;
      for (i=0; i<Howler._howls.length; i++) {
        if (Howler._howls[i]._src === self._src || self._src.indexOf(Howler._howls[i]._src) >= 0) {
          remCache = false;
          break;
        }
      }

      if (cache && remCache) {
        delete cache[self._src];
      }

      // Clear global errors.
      Howler.noAudio = false;

      // Clear out `self`.
      self._state = 'unloaded';
      self._sounds = [];
      self = null;

      return null;
    },

    /**
     * Listen to a custom event.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
     * @return {Howl}
     */
    on: function(event, fn, id, once) {
      var self = this;
      var events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
      }

      return self;
    },

    /**
     * Remove a custom event. Call without parameters to remove all events.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to remove. Leave empty to remove all.
     * @param  {Number}   id    (optional) Only remove events for this sound.
     * @return {Howl}
     */
    off: function(event, fn, id) {
      var self = this;
      var events = self['_on' + event];
      var i = 0;

      // Allow passing just an event and ID.
      if (typeof fn === 'number') {
        id = fn;
        fn = null;
      }

      if (fn || id) {
        // Loop through event store and remove the passed function.
        for (i=0; i<events.length; i++) {
          var isId = (id === events[i].id);
          if (fn === events[i].fn && isId || !fn && isId) {
            events.splice(i, 1);
            break;
          }
        }
      } else if (event) {
        // Clear out all events of this type.
        self['_on' + event] = [];
      } else {
        // Clear out all events of every type.
        var keys = Object.keys(self);
        for (i=0; i<keys.length; i++) {
          if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
            self[keys[i]] = [];
          }
        }
      }

      return self;
    },

    /**
     * Listen to a custom event and remove it once fired.
     * @param  {String}   event Event name.
     * @param  {Function} fn    Listener to call.
     * @param  {Number}   id    (optional) Only listen to events for this sound.
     * @return {Howl}
     */
    once: function(event, fn, id) {
      var self = this;

      // Setup the event listener.
      self.on(event, fn, id, 1);

      return self;
    },

    /**
     * Emit all events of a specific type and pass the sound id.
     * @param  {String} event Event name.
     * @param  {Number} id    Sound ID.
     * @param  {Number} msg   Message to go with event.
     * @return {Howl}
     */
    _emit: function(event, id, msg) {
      var self = this;
      var events = self['_on' + event];

      // Loop through event store and fire all functions.
      for (var i=events.length-1; i>=0; i--) {
        // Only fire the listener if the correct ID is used.
        if (!events[i].id || events[i].id === id || event === 'load') {
          setTimeout(function(fn) {
            fn.call(this, id, msg);
          }.bind(self, events[i].fn), 0);

          // If this event was setup with `once`, remove it.
          if (events[i].once) {
            self.off(event, events[i].fn, events[i].id);
          }
        }
      }

      // Pass the event type into load queue so that it can continue stepping.
      self._loadQueue(event);

      return self;
    },

    /**
     * Queue of actions initiated before the sound has loaded.
     * These will be called in sequence, with the next only firing
     * after the previous has finished executing (even if async like play).
     * @return {Howl}
     */
    _loadQueue: function(event) {
      var self = this;

      if (self._queue.length > 0) {
        var task = self._queue[0];

        // Remove this task if a matching event was passed.
        if (task.event === event) {
          self._queue.shift();
          self._loadQueue();
        }

        // Run the task if no event type is passed.
        if (!event) {
          task.action();
        }
      }

      return self;
    },

    /**
     * Fired when playback ends at the end of the duration.
     * @param  {Sound} sound The sound object to work with.
     * @return {Howl}
     */
    _ended: function(sound) {
      var self = this;
      var sprite = sound._sprite;

      // If we are using IE and there was network latency we may be clipping
      // audio before it completes playing. Lets check the node to make sure it
      // believes it has completed, before ending the playback.
      if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
        setTimeout(self._ended.bind(self, sound), 100);
        return self;
      }

      // Should this sound loop?
      var loop = !!(sound._loop || self._sprite[sprite][2]);

      // Fire the ended event.
      self._emit('end', sound._id);

      // Restart the playback for HTML5 Audio loop.
      if (!self._webAudio && loop) {
        self.stop(sound._id, true).play(sound._id);
      }

      // Restart this timer if on a Web Audio loop.
      if (self._webAudio && loop) {
        self._emit('play', sound._id);
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        sound._playStart = Howler.ctx.currentTime;

        var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
        self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
      }

      // Mark the node as paused.
      if (self._webAudio && !loop) {
        sound._paused = true;
        sound._ended = true;
        sound._seek = sound._start || 0;
        sound._rateSeek = 0;
        self._clearTimer(sound._id);

        // Clean up the buffer source.
        self._cleanBuffer(sound._node);

        // Attempt to auto-suspend AudioContext if no sounds are still playing.
        Howler._autoSuspend();
      }

      // When using a sprite, end the track.
      if (!self._webAudio && !loop) {
        self.stop(sound._id, true);
      }

      return self;
    },

    /**
     * Clear the end timer for a sound playback.
     * @param  {Number} id The sound ID.
     * @return {Howl}
     */
    _clearTimer: function(id) {
      var self = this;

      if (self._endTimers[id]) {
        // Clear the timeout or remove the ended listener.
        if (typeof self._endTimers[id] !== 'function') {
          clearTimeout(self._endTimers[id]);
        } else {
          var sound = self._soundById(id);
          if (sound && sound._node) {
            sound._node.removeEventListener('ended', self._endTimers[id], false);
          }
        }

        delete self._endTimers[id];
      }

      return self;
    },

    /**
     * Return the sound identified by this ID, or return null.
     * @param  {Number} id Sound ID
     * @return {Object}    Sound object or null.
     */
    _soundById: function(id) {
      var self = this;

      // Loop through all sounds and find the one with this ID.
      for (var i=0; i<self._sounds.length; i++) {
        if (id === self._sounds[i]._id) {
          return self._sounds[i];
        }
      }

      return null;
    },

    /**
     * Return an inactive sound from the pool or create a new one.
     * @return {Sound} Sound playback object.
     */
    _inactiveSound: function() {
      var self = this;

      self._drain();

      // Find the first inactive node to recycle.
      for (var i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          return self._sounds[i].reset();
        }
      }

      // If no inactive node was found, create a new one.
      return new Sound(self);
    },

    /**
     * Drain excess inactive sounds from the pool.
     */
    _drain: function() {
      var self = this;
      var limit = self._pool;
      var cnt = 0;
      var i = 0;

      // If there are less sounds than the max pool size, we are done.
      if (self._sounds.length < limit) {
        return;
      }

      // Count the number of inactive sounds.
      for (i=0; i<self._sounds.length; i++) {
        if (self._sounds[i]._ended) {
          cnt++;
        }
      }

      // Remove excess inactive sounds, going in reverse order.
      for (i=self._sounds.length - 1; i>=0; i--) {
        if (cnt <= limit) {
          return;
        }

        if (self._sounds[i]._ended) {
          // Disconnect the audio source when using Web Audio.
          if (self._webAudio && self._sounds[i]._node) {
            self._sounds[i]._node.disconnect(0);
          }

          // Remove sounds until we have the pool size.
          self._sounds.splice(i, 1);
          cnt--;
        }
      }
    },

    /**
     * Get all ID's from the sounds pool.
     * @param  {Number} id Only return one ID if one is passed.
     * @return {Array}    Array of IDs.
     */
    _getSoundIds: function(id) {
      var self = this;

      if (typeof id === 'undefined') {
        var ids = [];
        for (var i=0; i<self._sounds.length; i++) {
          ids.push(self._sounds[i]._id);
        }

        return ids;
      } else {
        return [id];
      }
    },

    /**
     * Load the sound back into the buffer source.
     * @param  {Sound} sound The sound object to work with.
     * @return {Howl}
     */
    _refreshBuffer: function(sound) {
      var self = this;

      // Setup the buffer source for playback.
      sound._node.bufferSource = Howler.ctx.createBufferSource();
      sound._node.bufferSource.buffer = cache[self._src];

      // Connect to the correct node.
      if (sound._panner) {
        sound._node.bufferSource.connect(sound._panner);
      } else {
        sound._node.bufferSource.connect(sound._node);
      }

      // Setup looping and playback rate.
      sound._node.bufferSource.loop = sound._loop;
      if (sound._loop) {
        sound._node.bufferSource.loopStart = sound._start || 0;
        sound._node.bufferSource.loopEnd = sound._stop || 0;
      }
      sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx.currentTime);

      return self;
    },

    /**
     * Prevent memory leaks by cleaning up the buffer source after playback.
     * @param  {Object} node Sound's audio node containing the buffer source.
     * @return {Howl}
     */
    _cleanBuffer: function(node) {
      var self = this;
      var isIOS = Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;

      if (Howler._scratchBuffer && node.bufferSource) {
        node.bufferSource.onended = null;
        node.bufferSource.disconnect(0);
        if (isIOS) {
          try { node.bufferSource.buffer = Howler._scratchBuffer; } catch(e) {}
        }
      }
      node.bufferSource = null;

      return self;
    },

    /**
     * Set the source to a 0-second silence to stop any downloading (except in IE).
     * @param  {Object} node Audio node to clear.
     */
    _clearSound: function(node) {
      var checkIE = /MSIE |Trident\//.test(Howler._navigator && Howler._navigator.userAgent);
      if (!checkIE) {
        node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      }
    }
  };

  /** Single Sound Methods **/
  /***************************************************************************/

  /**
   * Setup the sound object, which each node attached to a Howl group is contained in.
   * @param {Object} howl The Howl parent group.
   */
  var Sound = function(howl) {
    this._parent = howl;
    this.init();
  };
  Sound.prototype = {
    /**
     * Initialize a new Sound object.
     * @return {Sound}
     */
    init: function() {
      var self = this;
      var parent = self._parent;

      // Setup the default parameters.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._rate = parent._rate;
      self._seek = 0;
      self._paused = true;
      self._ended = true;
      self._sprite = '__default';

      // Generate a unique ID for this sound.
      self._id = ++Howler._counter;

      // Add itself to the parent's pool.
      parent._sounds.push(self);

      // Create the new node.
      self.create();

      return self;
    },

    /**
     * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
     * @return {Sound}
     */
    create: function() {
      var self = this;
      var parent = self._parent;
      var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume;

      if (parent._webAudio) {
        // Create the gain node for controlling volume (the source will connect to this).
        self._node = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
        self._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
        self._node.paused = true;
        self._node.connect(Howler.masterGain);
      } else if (!Howler.noAudio) {
        // Get an unlocked Audio object from the pool.
        self._node = Howler._obtainHtml5Audio();

        // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
        self._errorFn = self._errorListener.bind(self);
        self._node.addEventListener('error', self._errorFn, false);

        // Listen for 'canplaythrough' event to let us know the sound is ready.
        self._loadFn = self._loadListener.bind(self);
        self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);

        // Setup the new audio node.
        self._node.src = parent._src;
        self._node.preload = parent._preload === true ? 'auto' : parent._preload;
        self._node.volume = volume * Howler.volume();

        // Begin loading the source.
        self._node.load();
      }

      return self;
    },

    /**
     * Reset the parameters of this sound to the original state (for recycle).
     * @return {Sound}
     */
    reset: function() {
      var self = this;
      var parent = self._parent;

      // Reset all of the parameters of this sound.
      self._muted = parent._muted;
      self._loop = parent._loop;
      self._volume = parent._volume;
      self._rate = parent._rate;
      self._seek = 0;
      self._rateSeek = 0;
      self._paused = true;
      self._ended = true;
      self._sprite = '__default';

      // Generate a new ID so that it isn't confused with the previous sound.
      self._id = ++Howler._counter;

      return self;
    },

    /**
     * HTML5 Audio error listener callback.
     */
    _errorListener: function() {
      var self = this;

      // Fire an error event and pass back the code.
      self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);

      // Clear the event listener.
      self._node.removeEventListener('error', self._errorFn, false);
    },

    /**
     * HTML5 Audio canplaythrough listener callback.
     */
    _loadListener: function() {
      var self = this;
      var parent = self._parent;

      // Round up the duration to account for the lower precision in HTML5 Audio.
      parent._duration = Math.ceil(self._node.duration * 10) / 10;

      // Setup a sprite if none is defined.
      if (Object.keys(parent._sprite).length === 0) {
        parent._sprite = {__default: [0, parent._duration * 1000]};
      }

      if (parent._state !== 'loaded') {
        parent._state = 'loaded';
        parent._emit('load');
        parent._loadQueue();
      }

      // Clear the event listener.
      self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
    }
  };

  /** Helper Methods **/
  /***************************************************************************/

  var cache = {};

  /**
   * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
   * @param  {Howl} self
   */
  var loadBuffer = function(self) {
    var url = self._src;

    // Check if the buffer has already been cached and use it instead.
    if (cache[url]) {
      // Set the duration from the cache.
      self._duration = cache[url].duration;

      // Load the sound into this Howl.
      loadSound(self);

      return;
    }

    if (/^data:[^;]+;base64,/.test(url)) {
      // Decode the base64 data URI without XHR, since some browsers don't support it.
      var data = atob(url.split(',')[1]);
      var dataView = new Uint8Array(data.length);
      for (var i=0; i<data.length; ++i) {
        dataView[i] = data.charCodeAt(i);
      }

      decodeAudioData(dataView.buffer, self);
    } else {
      // Load the buffer from the URL.
      var xhr = new XMLHttpRequest();
      xhr.open(self._xhr.method, url, true);
      xhr.withCredentials = self._xhr.withCredentials;
      xhr.responseType = 'arraybuffer';

      // Apply any custom headers to the request.
      if (self._xhr.headers) {
        Object.keys(self._xhr.headers).forEach(function(key) {
          xhr.setRequestHeader(key, self._xhr.headers[key]);
        });
      }

      xhr.onload = function() {
        // Make sure we get a successful response back.
        var code = (xhr.status + '')[0];
        if (code !== '0' && code !== '2' && code !== '3') {
          self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
          return;
        }

        decodeAudioData(xhr.response, self);
      };
      xhr.onerror = function() {
        // If there is an error, switch to HTML5 Audio.
        if (self._webAudio) {
          self._html5 = true;
          self._webAudio = false;
          self._sounds = [];
          delete cache[url];
          self.load();
        }
      };
      safeXhrSend(xhr);
    }
  };

  /**
   * Send the XHR request wrapped in a try/catch.
   * @param  {Object} xhr XHR to send.
   */
  var safeXhrSend = function(xhr) {
    try {
      xhr.send();
    } catch (e) {
      xhr.onerror();
    }
  };

  /**
   * Decode audio data from an array buffer.
   * @param  {ArrayBuffer} arraybuffer The audio data.
   * @param  {Howl}        self
   */
  var decodeAudioData = function(arraybuffer, self) {
    // Fire a load error if something broke.
    var error = function() {
      self._emit('loaderror', null, 'Decoding audio data failed.');
    };

    // Load the sound on success.
    var success = function(buffer) {
      if (buffer && self._sounds.length > 0) {
        cache[self._src] = buffer;
        loadSound(self, buffer);
      } else {
        error();
      }
    };

    // Decode the buffer into an audio source.
    if (typeof Promise !== 'undefined' && Howler.ctx.decodeAudioData.length === 1) {
      Howler.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
    } else {
      Howler.ctx.decodeAudioData(arraybuffer, success, error);
    }
  }

  /**
   * Sound is now loaded, so finish setting everything up and fire the loaded event.
   * @param  {Howl} self
   * @param  {Object} buffer The decoded buffer sound source.
   */
  var loadSound = function(self, buffer) {
    // Set the duration.
    if (buffer && !self._duration) {
      self._duration = buffer.duration;
    }

    // Setup a sprite if none is defined.
    if (Object.keys(self._sprite).length === 0) {
      self._sprite = {__default: [0, self._duration * 1000]};
    }

    // Fire the loaded event.
    if (self._state !== 'loaded') {
      self._state = 'loaded';
      self._emit('load');
      self._loadQueue();
    }
  };

  /**
   * Setup the audio context when available, or switch to HTML5 Audio mode.
   */
  var setupAudioContext = function() {
    // If we have already detected that Web Audio isn't supported, don't run this step again.
    if (!Howler.usingWebAudio) {
      return;
    }

    // Check if we are using Web Audio and setup the AudioContext if we are.
    try {
      if (typeof AudioContext !== 'undefined') {
        Howler.ctx = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        Howler.ctx = new webkitAudioContext();
      } else {
        Howler.usingWebAudio = false;
      }
    } catch(e) {
      Howler.usingWebAudio = false;
    }

    // If the audio context creation still failed, set using web audio to false.
    if (!Howler.ctx) {
      Howler.usingWebAudio = false;
    }

    // Check if a webview is being used on iOS8 or earlier (rather than the browser).
    // If it is, disable Web Audio as it causes crashing.
    var iOS = (/iP(hone|od|ad)/.test(Howler._navigator && Howler._navigator.platform));
    var appVersion = Howler._navigator && Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
    var version = appVersion ? parseInt(appVersion[1], 10) : null;
    if (iOS && version && version < 9) {
      var safari = /safari/.test(Howler._navigator && Howler._navigator.userAgent.toLowerCase());
      if (Howler._navigator && !safari) {
        Howler.usingWebAudio = false;
      }
    }

    // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
    if (Howler.usingWebAudio) {
      Howler.masterGain = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
      Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : Howler._volume, Howler.ctx.currentTime);
      Howler.masterGain.connect(Howler.ctx.destination);
    }

    // Re-run the setup on Howler.
    Howler._setup();
  };

  // Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  // Add support for CommonJS libraries such as browserify.
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // Add to global in Node.js (for testing, etc).
  if (typeof global !== 'undefined') {
    global.HowlerGlobal = HowlerGlobal;
    global.Howler = Howler;
    global.Howl = Howl;
    global.Sound = Sound;
  } else if (typeof window !== 'undefined') {  // Define globally in case AMD is not available or unused.
    window.HowlerGlobal = HowlerGlobal;
    window.Howler = Howler;
    window.Howl = Howl;
    window.Sound = Sound;
  }
})();


/*!
 *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
 *  
 *  howler.js v2.2.0
 *  howlerjs.com
 *
 *  (c) 2013-2020, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {

  'use strict';

  // Setup default properties.
  HowlerGlobal.prototype._pos = [0, 0, 0];
  HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Helper method to update the stereo panning position of all current Howls.
   * Future Howls will not use this value unless explicitly set.
   * @param  {Number} pan A value of -1.0 is all the way left and 1.0 is all the way right.
   * @return {Howler/Number}     Self or current stereo panning value.
   */
  HowlerGlobal.prototype.stereo = function(pan) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Loop through all Howls and update their stereo panning.
    for (var i=self._howls.length-1; i>=0; i--) {
      self._howls[i].stereo(pan);
    }

    return self;
  };

  /**
   * Get/set the position of the listener in 3D cartesian space. Sounds using
   * 3D position will be relative to the listener's position.
   * @param  {Number} x The x-position of the listener.
   * @param  {Number} y The y-position of the listener.
   * @param  {Number} z The z-position of the listener.
   * @return {Howler/Array}   Self or current listener position.
   */
  HowlerGlobal.prototype.pos = function(x, y, z) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? self._pos[1] : y;
    z = (typeof z !== 'number') ? self._pos[2] : z;

    if (typeof x === 'number') {
      self._pos = [x, y, z];

      if (typeof self.ctx.listener.positionX !== 'undefined') {
        self.ctx.listener.positionX.setTargetAtTime(self._pos[0], Howler.ctx.currentTime, 0.1);
        self.ctx.listener.positionY.setTargetAtTime(self._pos[1], Howler.ctx.currentTime, 0.1);
        self.ctx.listener.positionZ.setTargetAtTime(self._pos[2], Howler.ctx.currentTime, 0.1);
      } else {
        self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
      }
    } else {
      return self._pos;
    }

    return self;
  };

  /**
   * Get/set the direction the listener is pointing in the 3D cartesian space.
   * A front and up vector must be provided. The front is the direction the
   * face of the listener is pointing, and up is the direction the top of the
   * listener is pointing. Thus, these values are expected to be at right angles
   * from each other.
   * @param  {Number} x   The x-orientation of the listener.
   * @param  {Number} y   The y-orientation of the listener.
   * @param  {Number} z   The z-orientation of the listener.
   * @param  {Number} xUp The x-orientation of the top of the listener.
   * @param  {Number} yUp The y-orientation of the top of the listener.
   * @param  {Number} zUp The z-orientation of the top of the listener.
   * @return {Howler/Array}     Returns self or the current orientation vectors.
   */
  HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self.ctx || !self.ctx.listener) {
      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    var or = self._orientation;
    y = (typeof y !== 'number') ? or[1] : y;
    z = (typeof z !== 'number') ? or[2] : z;
    xUp = (typeof xUp !== 'number') ? or[3] : xUp;
    yUp = (typeof yUp !== 'number') ? or[4] : yUp;
    zUp = (typeof zUp !== 'number') ? or[5] : zUp;

    if (typeof x === 'number') {
      self._orientation = [x, y, z, xUp, yUp, zUp];

      if (typeof self.ctx.listener.forwardX !== 'undefined') {
        self.ctx.listener.forwardX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
        self.ctx.listener.forwardY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
        self.ctx.listener.forwardZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
        self.ctx.listener.upX.setTargetAtTime(xUp, Howler.ctx.currentTime, 0.1);
        self.ctx.listener.upY.setTargetAtTime(yUp, Howler.ctx.currentTime, 0.1);
        self.ctx.listener.upZ.setTargetAtTime(zUp, Howler.ctx.currentTime, 0.1);
      } else {
        self.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
      }
    } else {
      return or;
    }

    return self;
  };

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Add new properties to the core init.
   * @param  {Function} _super Core init method.
   * @return {Howl}
   */
  Howl.prototype.init = (function(_super) {
    return function(o) {
      var self = this;

      // Setup user-defined default properties.
      self._orientation = o.orientation || [1, 0, 0];
      self._stereo = o.stereo || null;
      self._pos = o.pos || null;
      self._pannerAttr = {
        coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : 360,
        coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : 360,
        coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : 0,
        distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : 'inverse',
        maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : 10000,
        panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : 'HRTF',
        refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : 1,
        rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : 1
      };

      // Setup event listeners.
      self._onstereo = o.onstereo ? [{fn: o.onstereo}] : [];
      self._onpos = o.onpos ? [{fn: o.onpos}] : [];
      self._onorientation = o.onorientation ? [{fn: o.onorientation}] : [];

      // Complete initilization with howler.js core's init function.
      return _super.call(this, o);
    };
  })(Howl.prototype.init);

  /**
   * Get/set the stereo panning of the audio source for this sound or all in the group.
   * @param  {Number} pan  A value of -1.0 is all the way left and 1.0 is all the way right.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Number}    Returns self or the current stereo panning value.
   */
  Howl.prototype.stereo = function(pan, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'stereo',
        action: function() {
          self.stereo(pan, id);
        }
      });

      return self;
    }

    // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist.
    var pannerType = (typeof Howler.ctx.createStereoPanner === 'undefined') ? 'spatial' : 'stereo';

    // Setup the group's stereo panning if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's stereo panning if no parameters are passed.
      if (typeof pan === 'number') {
        self._stereo = pan;
        self._pos = [pan, 0, 0];
      } else {
        return self._stereo;
      }
    }

    // Change the streo panning of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof pan === 'number') {
          sound._stereo = pan;
          sound._pos = [pan, 0, 0];

          if (sound._node) {
            // If we are falling back, make sure the panningModel is equalpower.
            sound._pannerAttr.panningModel = 'equalpower';

            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner || !sound._panner.pan) {
              setupPanner(sound, pannerType);
            }

            if (pannerType === 'spatial') {
              if (typeof sound._panner.positionX !== 'undefined') {
                sound._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
                sound._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
                sound._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
              } else {
                sound._panner.setPosition(pan, 0, 0);
              }
            } else {
              sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
            }
          }

          self._emit('stereo', sound._id);
        } else {
          return sound._stereo;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
   * @param  {Number} x  The x-position of the audio source.
   * @param  {Number} y  The y-position of the audio source.
   * @param  {Number} z  The z-position of the audio source.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Array}    Returns self or the current 3D spatial position: [x, y, z].
   */
  Howl.prototype.pos = function(x, y, z, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change position when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'pos',
        action: function() {
          self.pos(x, y, z, id);
        }
      });

      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? 0 : y;
    z = (typeof z !== 'number') ? -0.5 : z;

    // Setup the group's spatial position if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's spatial position if no parameters are passed.
      if (typeof x === 'number') {
        self._pos = [x, y, z];
      } else {
        return self._pos;
      }
    }

    // Change the spatial position of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof x === 'number') {
          sound._pos = [x, y, z];

          if (sound._node) {
            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner || sound._panner.pan) {
              setupPanner(sound, 'spatial');
            }

            if (typeof sound._panner.positionX !== 'undefined') {
              sound._panner.positionX.setValueAtTime(x, Howler.ctx.currentTime);
              sound._panner.positionY.setValueAtTime(y, Howler.ctx.currentTime);
              sound._panner.positionZ.setValueAtTime(z, Howler.ctx.currentTime);
            } else {
              sound._panner.setPosition(x, y, z);
            }
          }

          self._emit('pos', sound._id);
        } else {
          return sound._pos;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the direction the audio source is pointing in the 3D cartesian coordinate
   * space. Depending on how direction the sound is, based on the `cone` attributes,
   * a sound pointing away from the listener can be quiet or silent.
   * @param  {Number} x  The x-orientation of the source.
   * @param  {Number} y  The y-orientation of the source.
   * @param  {Number} z  The z-orientation of the source.
   * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
   * @return {Howl/Array}    Returns self or the current 3D spatial orientation: [x, y, z].
   */
  Howl.prototype.orientation = function(x, y, z, id) {
    var self = this;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // If the sound hasn't loaded, add it to the load queue to change orientation when capable.
    if (self._state !== 'loaded') {
      self._queue.push({
        event: 'orientation',
        action: function() {
          self.orientation(x, y, z, id);
        }
      });

      return self;
    }

    // Set the defaults for optional 'y' & 'z'.
    y = (typeof y !== 'number') ? self._orientation[1] : y;
    z = (typeof z !== 'number') ? self._orientation[2] : z;

    // Setup the group's spatial orientation if no ID is passed.
    if (typeof id === 'undefined') {
      // Return the group's spatial orientation if no parameters are passed.
      if (typeof x === 'number') {
        self._orientation = [x, y, z];
      } else {
        return self._orientation;
      }
    }

    // Change the spatial orientation of one or all sounds in group.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      // Get the sound.
      var sound = self._soundById(ids[i]);

      if (sound) {
        if (typeof x === 'number') {
          sound._orientation = [x, y, z];

          if (sound._node) {
            // Check if there is a panner setup and create a new one if not.
            if (!sound._panner) {
              // Make sure we have a position to setup the node with.
              if (!sound._pos) {
                sound._pos = self._pos || [0, 0, -0.5];
              }

              setupPanner(sound, 'spatial');
            }

            if (typeof sound._panner.orientationX !== 'undefined') {
              sound._panner.orientationX.setValueAtTime(x, Howler.ctx.currentTime);
              sound._panner.orientationY.setValueAtTime(y, Howler.ctx.currentTime);
              sound._panner.orientationZ.setValueAtTime(z, Howler.ctx.currentTime);
            } else {
              sound._panner.setOrientation(x, y, z);
            }
          }

          self._emit('orientation', sound._id);
        } else {
          return sound._orientation;
        }
      }
    }

    return self;
  };

  /**
   * Get/set the panner node's attributes for a sound or group of sounds.
   * This method can optionall take 0, 1 or 2 arguments.
   *   pannerAttr() -> Returns the group's values.
   *   pannerAttr(id) -> Returns the sound id's values.
   *   pannerAttr(o) -> Set's the values of all sounds in this Howl group.
   *   pannerAttr(o, id) -> Set's the values of passed sound id.
   *
   *   Attributes:
   *     coneInnerAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
   *                      inside of which there will be no volume reduction.
   *     coneOuterAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
   *                      outside of which the volume will be reduced to a constant value of `coneOuterGain`.
   *     coneOuterGain - (0 by default) A parameter for directional audio sources, this is the gain outside of the
   *                     `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
   *     distanceModel - ('inverse' by default) Determines algorithm used to reduce volume as audio moves away from
   *                     listener. Can be `linear`, `inverse` or `exponential.
   *     maxDistance - (10000 by default) The maximum distance between source and listener, after which the volume
   *                   will not be reduced any further.
   *     refDistance - (1 by default) A reference distance for reducing volume as source moves further from the listener.
   *                   This is simply a variable of the distance model and has a different effect depending on which model
   *                   is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
   *     rolloffFactor - (1 by default) How quickly the volume reduces as source moves from listener. This is simply a
   *                     variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]`
   *                     with `inverse` and `exponential`.
   *     panningModel - ('HRTF' by default) Determines which spatialization algorithm is used to position audio.
   *                     Can be `HRTF` or `equalpower`.
   *
   * @return {Howl/Object} Returns self or current panner attributes.
   */
  Howl.prototype.pannerAttr = function() {
    var self = this;
    var args = arguments;
    var o, id, sound;

    // Stop right here if not using Web Audio.
    if (!self._webAudio) {
      return self;
    }

    // Determine the values based on arguments.
    if (args.length === 0) {
      // Return the group's panner attribute values.
      return self._pannerAttr;
    } else if (args.length === 1) {
      if (typeof args[0] === 'object') {
        o = args[0];

        // Set the grou's panner attribute values.
        if (typeof id === 'undefined') {
          if (!o.pannerAttr) {
            o.pannerAttr = {
              coneInnerAngle: o.coneInnerAngle,
              coneOuterAngle: o.coneOuterAngle,
              coneOuterGain: o.coneOuterGain,
              distanceModel: o.distanceModel,
              maxDistance: o.maxDistance,
              refDistance: o.refDistance,
              rolloffFactor: o.rolloffFactor,
              panningModel: o.panningModel
            };
          }

          self._pannerAttr = {
            coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== 'undefined' ? o.pannerAttr.coneInnerAngle : self._coneInnerAngle,
            coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== 'undefined' ? o.pannerAttr.coneOuterAngle : self._coneOuterAngle,
            coneOuterGain: typeof o.pannerAttr.coneOuterGain !== 'undefined' ? o.pannerAttr.coneOuterGain : self._coneOuterGain,
            distanceModel: typeof o.pannerAttr.distanceModel !== 'undefined' ? o.pannerAttr.distanceModel : self._distanceModel,
            maxDistance: typeof o.pannerAttr.maxDistance !== 'undefined' ? o.pannerAttr.maxDistance : self._maxDistance,
            refDistance: typeof o.pannerAttr.refDistance !== 'undefined' ? o.pannerAttr.refDistance : self._refDistance,
            rolloffFactor: typeof o.pannerAttr.rolloffFactor !== 'undefined' ? o.pannerAttr.rolloffFactor : self._rolloffFactor,
            panningModel: typeof o.pannerAttr.panningModel !== 'undefined' ? o.pannerAttr.panningModel : self._panningModel
          };
        }
      } else {
        // Return this sound's panner attribute values.
        sound = self._soundById(parseInt(args[0], 10));
        return sound ? sound._pannerAttr : self._pannerAttr;
      }
    } else if (args.length === 2) {
      o = args[0];
      id = parseInt(args[1], 10);
    }

    // Update the values of the specified sounds.
    var ids = self._getSoundIds(id);
    for (var i=0; i<ids.length; i++) {
      sound = self._soundById(ids[i]);

      if (sound) {
        // Merge the new values into the sound.
        var pa = sound._pannerAttr;
        pa = {
          coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
          coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
          coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
          distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
          maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
          refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
          rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
          panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel
        };

        // Update the panner values or create a new panner if none exists.
        var panner = sound._panner;
        if (panner) {
          panner.coneInnerAngle = pa.coneInnerAngle;
          panner.coneOuterAngle = pa.coneOuterAngle;
          panner.coneOuterGain = pa.coneOuterGain;
          panner.distanceModel = pa.distanceModel;
          panner.maxDistance = pa.maxDistance;
          panner.refDistance = pa.refDistance;
          panner.rolloffFactor = pa.rolloffFactor;
          panner.panningModel = pa.panningModel;
        } else {
          // Make sure we have a position to setup the node with.
          if (!sound._pos) {
            sound._pos = self._pos || [0, 0, -0.5];
          }

          // Create a new panner node.
          setupPanner(sound, 'spatial');
        }
      }
    }

    return self;
  };

  /** Single Sound Methods **/
  /***************************************************************************/

  /**
   * Add new properties to the core Sound init.
   * @param  {Function} _super Core Sound init method.
   * @return {Sound}
   */
  Sound.prototype.init = (function(_super) {
    return function() {
      var self = this;
      var parent = self._parent;

      // Setup user-defined default properties.
      self._orientation = parent._orientation;
      self._stereo = parent._stereo;
      self._pos = parent._pos;
      self._pannerAttr = parent._pannerAttr;

      // Complete initilization with howler.js core Sound's init function.
      _super.call(this);

      // If a stereo or position was specified, set it up.
      if (self._stereo) {
        parent.stereo(self._stereo);
      } else if (self._pos) {
        parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
      }
    };
  })(Sound.prototype.init);

  /**
   * Override the Sound.reset method to clean up properties from the spatial plugin.
   * @param  {Function} _super Sound reset method.
   * @return {Sound}
   */
  Sound.prototype.reset = (function(_super) {
    return function() {
      var self = this;
      var parent = self._parent;

      // Reset all spatial plugin properties on this sound.
      self._orientation = parent._orientation;
      self._stereo = parent._stereo;
      self._pos = parent._pos;
      self._pannerAttr = parent._pannerAttr;

      // If a stereo or position was specified, set it up.
      if (self._stereo) {
        parent.stereo(self._stereo);
      } else if (self._pos) {
        parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
      } else if (self._panner) {
        // Disconnect the panner.
        self._panner.disconnect(0);
        self._panner = undefined;
        parent._refreshBuffer(self);
      }

      // Complete resetting of the sound.
      return _super.call(this);
    };
  })(Sound.prototype.reset);

  /** Helper Methods **/
  /***************************************************************************/

  /**
   * Create a new panner node and save it on the sound.
   * @param  {Sound} sound Specific sound to setup panning on.
   * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
   */
  var setupPanner = function(sound, type) {
    type = type || 'spatial';

    // Create the new panner node.
    if (type === 'spatial') {
      sound._panner = Howler.ctx.createPanner();
      sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
      sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
      sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
      sound._panner.distanceModel = sound._pannerAttr.distanceModel;
      sound._panner.maxDistance = sound._pannerAttr.maxDistance;
      sound._panner.refDistance = sound._pannerAttr.refDistance;
      sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
      sound._panner.panningModel = sound._pannerAttr.panningModel;

      if (typeof sound._panner.positionX !== 'undefined') {
        sound._panner.positionX.setValueAtTime(sound._pos[0], Howler.ctx.currentTime);
        sound._panner.positionY.setValueAtTime(sound._pos[1], Howler.ctx.currentTime);
        sound._panner.positionZ.setValueAtTime(sound._pos[2], Howler.ctx.currentTime);
      } else {
        sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
      }

      if (typeof sound._panner.orientationX !== 'undefined') {
        sound._panner.orientationX.setValueAtTime(sound._orientation[0], Howler.ctx.currentTime);
        sound._panner.orientationY.setValueAtTime(sound._orientation[1], Howler.ctx.currentTime);
        sound._panner.orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx.currentTime);
      } else {
        sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
      }
    } else {
      sound._panner = Howler.ctx.createStereoPanner();
      sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
    }

    sound._panner.connect(sound._node);

    // Update the connections.
    if (!sound._paused) {
      sound._parent.pause(sound._id, true).play(sound._id, true);
    }
  };
})();

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtMaker = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
const chancetable_1 = require("./chancetable");
const bitgrid_1 = require("./draws/bitgrid");
const rosedots_1 = require("./draws/rosedots");
const effectrand_1 = require("./effectrand");
const utils_1 = require("./utils");
const rand_1 = require("./rand");
function canvasAndContext(width, height, kind) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext(kind);
    if (context === null) {
        throw new Error(`failed to get ${kind} context`);
    }
    return [canvas, context];
}
class ArtMaker {
    constructor(width = utils_1.H, height = Math.floor((width * 9) / 16), id = "art") {
        this.timeScale = 1;
        this.mousePos = { x: width / 2, y: height / 2 };
        [this.glCanvas, this.gl] = canvasAndContext(width, height, "webgl2");
        [this.sourceCanvas, this.source] = canvasAndContext(width, height, "2d");
        this.glCanvas.addEventListener("mousemove", (e) => {
            const rect = this.glCanvas.getBoundingClientRect();
            this.mousePos.x = (width * (e.clientX - rect.left)) / rect.width;
            this.mousePos.y =
                (height * (rect.height - (e.clientY - rect.top))) / rect.height;
        });
        const elem = document.getElementById(id);
        if (elem === null) {
            throw new Error(`could not find element with id "${id}"`);
        }
        elem.appendChild(this.glCanvas);
    }
    art(seed) {
        this.source.restore();
        this.source.save();
        this.source.scale(this.sourceCanvas.width / utils_1.H, this.sourceCanvas.height / utils_1.V);
        if (this.curAnimationFrame !== undefined) {
            cancelAnimationFrame(this.curAnimationFrame);
        }
        this.rand = new rand_1.Rand(seed);
        this.timeScale = this.rand.between(0.4, 1.1);
        const effects = [...effectrand_1.randomEffects(3, this.rand)];
        const merger = new merge_pass_1.Merger(effects, this.sourceCanvas, this.gl, {
            channels: [null, null],
            edgeMode: "wrap",
        });
        const chanceTable = new chancetable_1.ChanceTable(this.rand);
        chanceTable.addAll([
            [rosedots_1.roseDots, 1],
            [bitgrid_1.bitGrid, 1],
        ]);
        const drawFunc = chanceTable.pick()(this.rand);
        const update = (time) => {
            if (this.originalTime === undefined)
                this.originalTime = time;
            const t = ((time - this.originalTime) / 1000) * this.timeScale;
            drawFunc(t, 0, this.source, this.sourceCanvas);
            merger.draw(t, this.mousePos.x, this.mousePos.y);
            this.curAnimationFrame = requestAnimationFrame(update);
        };
        this.curAnimationFrame = requestAnimationFrame(update);
    }
}
exports.ArtMaker = ArtMaker;
ArtMaker.seedVersion = "0";

},{"./chancetable":6,"./draws/bitgrid":7,"./draws/rosedots":8,"./effectrand":9,"./rand":11,"./utils":12,"@bandaloo/merge-pass":64}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChanceTable = void 0;
class ChanceTable {
    constructor(rand) {
        this.rand = rand;
        this.info = new Map();
    }
    add(result, weight, decr = 0) {
        if (decr > 0)
            throw new Error("decr has to be < 0");
        this.info.set(result, { weight, decr });
    }
    addAll(pairs) {
        for (const p of pairs)
            this.add(p[0], p[1], p[2]);
    }
    pickFromMap(map) {
        // TODO change to reduce
        let sum = 0;
        for (const chance of map.values())
            sum += chance.weight;
        // choose a number and count up until that choice
        let choice = this.rand.random() * sum;
        let count = 0;
        for (const [result, chance] of map.entries()) {
            if (choice > count && choice < count + chance.weight) {
                chance.weight = Math.max(chance.weight + chance.decr, 0);
                return result;
            }
            count += chance.weight;
        }
        throw new Error("somehow nothing was chosen from chance table");
    }
    pick(num) {
        const cloned = new Map();
        for (const m of this.info)
            cloned.set(m[0], Object.assign({}, m[1]));
        // return just one result
        if (num === undefined)
            return this.pickFromMap(cloned);
        // return an array of results
        const results = [];
        for (let i = 0; i < num; i++) {
            results.push(this.pickFromMap(cloned));
        }
        return results;
    }
}
exports.ChanceTable = ChanceTable;

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bitGrid = void 0;
const chancetable_1 = require("../chancetable");
const utils_1 = require("../utils");
function bitGrid(rand) {
    const r = () => rand.random() * 255;
    const color1 = [r(), r(), r()];
    const color2 = [r(), r(), r()];
    const hNum = Math.floor(rand.between(15, 40));
    const vNum = Math.floor(rand.between(15, 40));
    const clearBackground = utils_1.randBackgroundFunc(rand);
    const smooth = rand.random() > 0.2;
    const xorFunc = (() => {
        const div = rand.between(10, 50);
        const m = rand.between(1, 2);
        return (i, j) => ((i ^ j) / div) % m;
    })();
    const andFunc = (() => {
        const div = rand.between(1, 4);
        return (i, j) => (i & j) / div;
    })();
    const plusMinusXorFunc = (() => {
        const div = rand.between(3, 12);
        const m = Math.floor(rand.between(1, 6));
        return (i, j) => (((i - j) ^ (j + i)) / div) % m;
    })();
    const colorFuncTable = new chancetable_1.ChanceTable(rand);
    colorFuncTable.addAll([
        [xorFunc, 1],
        [andFunc, 2],
        [plusMinusXorFunc, 1],
    ]);
    const colorFunc = colorFuncTable.pick();
    const sinFunc = (() => {
        const xAmp = rand.between(0.3, 1.5);
        const yAmp = rand.between(0.3, 1.5);
        const xSpeed = rand.between(0.3, 2);
        const ySpeed = rand.between(0.3, 2);
        const xFreq = rand.between(1, 9);
        const yFreq = rand.between(1, 9);
        return (i, j, t) => xAmp * Math.sin(xSpeed * t + xFreq * i) +
            yAmp * Math.cos(ySpeed + t + yFreq * j);
    })();
    const oneFunc = () => 1;
    const sizeFuncTable = new chancetable_1.ChanceTable(rand);
    sizeFuncTable.addAll([
        [sinFunc, 1.5],
        [oneFunc, 1],
    ]);
    const sizeFunc = sizeFuncTable.pick();
    const hSize = utils_1.H / hNum;
    const vSize = utils_1.V / vNum;
    const speed = rand.random() < 0.05 ? 0 : 0.25 + rand.random() * 9;
    const up = rand.random() < 0.5;
    const iSpeed = !up ? speed : 0;
    const jSpeed = up ? speed : 0;
    const overscan = sizeFunc !== oneFunc ? 2 : 0;
    const overscanX = iSpeed !== 0 ? overscan : 0;
    const overscanY = jSpeed !== 0 ? overscan : 0;
    return (t, fr, x, c) => {
        clearBackground(x);
        for (let i = 0 - overscanX; i < hNum + 1 + overscanX; i++) {
            const ri = Math.floor(i + t * iSpeed);
            const iOffset = smooth ? (t * iSpeed) % 1 : 0;
            for (let j = 0 - overscanY; j < vNum + 1 + overscanY; j++) {
                const rj = Math.floor(j + t * jSpeed);
                const jOffset = smooth ? (t * jSpeed) % 1 : 0;
                const size = sizeFunc(ri, rj, t);
                x.fillStyle = utils_1.R(...utils_1.mix(color1, color2, colorFunc(ri, rj)));
                x.fillRect((i - iOffset) * hSize, (j - jOffset) * vSize, hSize * size, vSize * size);
            }
        }
    };
}
exports.bitGrid = bitGrid;

},{"../chancetable":6,"../utils":12}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roseDots = void 0;
const chancetable_1 = require("../chancetable");
const utils_1 = require("../utils");
function roseDots(rand) {
    // common attributes
    const r = () => rand.random() * 255;
    const color1 = [r(), r(), r()];
    const color2 = [r(), r(), r()];
    const size = 0.5 + rand.random();
    const freq = 0.8 + rand.random();
    const speed = rand.between(0.25, 1.75);
    const num = Math.floor(rand.between(30, 70));
    const clearBackground = utils_1.randBackgroundFunc(rand);
    // specific to second drawing pattern
    const lineWidth = rand.between(3, 15);
    const segments = [15 + rand.int(20), rand.int(20), rand.int(20)];
    const copies = rand.int(15) + 2;
    const spacing = rand.between(100, 500);
    const chanceTable = new chancetable_1.ChanceTable(rand);
    chanceTable.addAll([
        [(i, t) => Math.tan(freq2 * t + freq3 * i), 1],
        [(i, t) => Math.sin(freq2 * t + freq3 * i), 1],
        [(i, t) => Math.pow(Math.sin(freq2 * t + freq3 * i), 3), 1],
        [(i, t) => speed * i * t, 1],
    ]);
    const posFunc = chanceTable.pick();
    const freq2 = rand.between(0.2, 2);
    const freq3 = rand.between(0.2, 2);
    return rand.random() < 0.5
        ? (t, fr, x, c) => {
            clearBackground(x);
            for (let i = 0; i < num; i += 0.5) {
                x.beginPath();
                let d = 2 * utils_1.C((2 + utils_1.S((speed * t) / 99)) * 2 * i);
                x.arc(utils_1.H / 2 + d * 9 * utils_1.C(i * freq) * i, utils_1.V / 2 + d * 9 * utils_1.S(i * freq) * i, i * size, 0, Math.PI * 2);
                x.fillStyle = utils_1.R(...utils_1.mix(color1, color2, i / 50));
                x.fill();
            }
        }
        : (t, fr, x, c) => {
            clearBackground(x);
            x.lineWidth = lineWidth;
            x.setLineDash(segments);
            for (let i = 0; i < copies; i++) {
                x.strokeStyle = utils_1.R(...utils_1.mix(color1, color2, i / (copies - 1)));
                x.beginPath();
                for (let j = 0; j < num; j++) {
                    x.lineTo((j / (num - 1)) * utils_1.H, utils_1.V / 2 +
                        99 * size * Math.sin(j / freq + speed * posFunc(i, t)) +
                        spacing * ((i - (copies - 1) / 2) / (copies - 1)));
                }
                x.stroke();
            }
        };
}
exports.roseDots = roseDots;

},{"../chancetable":6,"../utils":12}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomEffects = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
const postpre_1 = require("postpre");
const chancetable_1 = require("./chancetable");
function randPos(rand) {
    const chanceTable = new chancetable_1.ChanceTable(rand);
    chanceTable.addAll([
        [() => merge_pass_1.nmouse(), 3],
        [() => merge_pass_1.vec2(0.5, 0.5), 1],
        [
            (() => {
                const freq1 = (1 + rand.int(5)) / 3;
                const freq2 = (1 + rand.int(5)) / 3;
                const s = merge_pass_1.op(merge_pass_1.a1("sin", merge_pass_1.op(merge_pass_1.time(), "*", freq1)), "*", 0.5);
                const c = merge_pass_1.op(merge_pass_1.a1("cos", merge_pass_1.op(merge_pass_1.time(), "*", freq2)), "*", 0.5);
                return () => merge_pass_1.vec2(merge_pass_1.op(s, "+", 0.5), merge_pass_1.op(c, "+", 0.5));
            })(),
            1,
        ],
    ]);
    return chanceTable.pick()();
}
const kaleidoscopeRand = (rand) => {
    const chanceTable = new chancetable_1.ChanceTable(rand);
    chanceTable.addAll([
        [4, 2],
        [8, 2],
        [12, 1],
        [16, 1],
        [32, 0.5],
    ]);
    return postpre_1.kaleidoscope(chanceTable.pick());
};
const edgeRand = (rand) => {
    return merge_pass_1.edge(Math.pow((-1), Math.floor(1 + rand.random() * 2)));
};
const noiseDisplacementRand = (rand) => {
    const period = 0.01 + Math.pow(rand.random(), 3);
    const periodExpr = rand.random() < 0.7
        ? merge_pass_1.pfloat(period)
        : merge_pass_1.op(merge_pass_1.op(merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.nmouse(), "x"), "*", 0.5), "+", 0.5), "*", period * 2);
    const intensity = period * (0.1 + 0.2 * Math.pow(rand.random(), 3));
    const speed = rand.between(-1.5, 1.5);
    const speedExpr = rand.random() < 0.7
        ? merge_pass_1.pfloat(speed)
        : merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.nmouse(), "x"), "*", speed * 2);
    const intensityExpr = rand.random() < 0.7
        ? merge_pass_1.pfloat(intensity)
        : merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.nmouse(), "x"), "*", intensity * 2);
    return postpre_1.noisedisplacement(periodExpr, speedExpr, intensityExpr);
};
const foggyRaysRand = () => {
    return postpre_1.foggyrays(100, 1, 0.3, 60, -1);
};
const motionBlurRand = (rand) => {
    return merge_pass_1.motionblur(1, rand.between(0.1, 0.4));
};
const blurAndTraceRand = (rand) => {
    return postpre_1.blurandtrace(rand.between(-1, 1));
};
const bloomRand = (rand) => {
    const threshold = rand.between(0.3, 0.5);
    const boost = rand.between(1.2, 1.5);
    return merge_pass_1.bloom(threshold, 1, 1, boost, 0);
};
const hueRotateRand = (rand) => {
    const speed = Math.pow(rand.between(0.01, 1), 2);
    const timeExpr = merge_pass_1.op(merge_pass_1.time(), "*", speed);
    return merge_pass_1.hsv2rgb(merge_pass_1.changecomp(merge_pass_1.rgb2hsv(merge_pass_1.fcolor()), rand.random() < 0
        ? merge_pass_1.op(timeExpr, "/", 2)
        : merge_pass_1.op(merge_pass_1.a1("sin", timeExpr), "*", rand.between(0.05, 0.2)), "r", "+"));
};
const colorDisplacementRand = (rand) => {
    const c = "rgb"[rand.int(3)];
    const d = "xy"[rand.int(2)];
    const o = rand.random() > 0.5 ? "+" : "-";
    const mult = merge_pass_1.pfloat(rand.between(0.01, 1.5) / 10);
    const chanceTable = new chancetable_1.ChanceTable(rand);
    chanceTable.addAll([
        [mult, 1],
        [merge_pass_1.op(mult, "*", merge_pass_1.a1("sin", merge_pass_1.op(merge_pass_1.time(), "*", rand.between(0.2, 1.3)))), 1],
        [merge_pass_1.op(mult, "*", merge_pass_1.getcomp(merge_pass_1.nmouse(), rand.random() < 0.5 ? "x" : "y")), 1],
    ]);
    const inside = chanceTable.pick();
    return merge_pass_1.channel(-1, merge_pass_1.changecomp(merge_pass_1.pos(), merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.fcolor(), c), "*", inside), d, o));
};
const swirlRand = (rand) => {
    const size = rand.between(1, 120); // inversely proportional
    const intensity = rand.between(5, 50) * (rand.random() > 0.5 ? 1 : -1);
    const vec = randPos(rand);
    const dist = merge_pass_1.op(merge_pass_1.len(merge_pass_1.op(merge_pass_1.pos(), "-", vec)), "*", size);
    const angle = merge_pass_1.op(merge_pass_1.op(1, "/", merge_pass_1.op(1, "+", dist)), "*", intensity);
    const centered = merge_pass_1.translate(merge_pass_1.pos(), merge_pass_1.op(vec, "*", -1));
    const rot = merge_pass_1.rotate(centered, angle);
    const reverted = merge_pass_1.translate(rot, vec);
    return merge_pass_1.channel(-1, reverted);
};
const repeatRand = (rand) => {
    const h = rand.int(6) + 3;
    const v = rand.int(6) + 3;
    const vec = rand.random() < 0.5
        ? merge_pass_1.vec2(h, v)
        : merge_pass_1.vec2(merge_pass_1.a1("floor", merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.nmouse(), "x"), "*", h * 2)), merge_pass_1.a1("floor", merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.nmouse(), "y"), "*", v * 2)));
    return merge_pass_1.channel(-1, merge_pass_1.a2("mod", merge_pass_1.op(merge_pass_1.pos(), "*", vec), merge_pass_1.vec2(1, 1)));
};
const celShadeRand = () => {
    return postpre_1.celshade(1, 0, 0.2, 0.03);
};
const grainRand = (rand) => {
    const intensity = rand.between(0.1, 0.3) * (rand.random() < 0.5 ? 1 : -1);
    const position = merge_pass_1.op(merge_pass_1.pixel(), "*", 0.3);
    const inside = rand.random() < 0.5 ? position : merge_pass_1.op(position, "+", merge_pass_1.time());
    return merge_pass_1.brightness(merge_pass_1.op(merge_pass_1.random(inside), "*", intensity));
};
const vignetteRand = (rand) => {
    return postpre_1.vignette();
};
function randomEffects(num, rand) {
    const chanceTable = new chancetable_1.ChanceTable(rand);
    chanceTable.addAll([
        [kaleidoscopeRand, 2, -Infinity],
        [noiseDisplacementRand, 3, -1],
        [edgeRand, 1],
        [blurAndTraceRand, 0.5, -0.25],
        [vignetteRand, 0.5],
        [hueRotateRand, 1, -Infinity],
        [foggyRaysRand, 3, -Infinity],
        [motionBlurRand, 1, -Infinity],
        [bloomRand, 0.25, -Infinity],
        [celShadeRand, 3, -Infinity],
        [colorDisplacementRand, 3],
        [swirlRand, 1, -Infinity],
        [repeatRand, 2, -1],
        [grainRand, 1, -Infinity],
    ]);
    return chanceTable.pick(num).map((n) => n(rand));
}
exports.randomEffects = randomEffects;

},{"./chancetable":6,"@bandaloo/merge-pass":64,"postpre":72}],10:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const artmaker_1 = require("./artmaker");
__exportStar(require("./rand"), exports);
exports.default = artmaker_1.ArtMaker;

},{"./artmaker":5,"./rand":11}],11:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rand = void 0;
const seedrandom_1 = __importDefault(require("seedrandom"));
class Rand {
    constructor(seed) {
        this.rand = seedrandom_1.default(seed !== null && seed !== void 0 ? seed : Rand.randString(8));
    }
    static randString(length) {
        return [...Array(length)]
            .map(() => "abcdefghijklmnopqrstuvwxyz"[Math.floor(26 * Math.random())])
            .join("");
    }
    between(lo, hi) {
        return lo + (hi - lo) * this.rand();
    }
    int(num) {
        return Math.floor(this.rand() * num);
    }
    random() {
        return this.rand();
    }
}
exports.Rand = Rand;

},{"seedrandom":78}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randBackgroundFunc = exports.mix = exports.R = exports.T = exports.S = exports.C = exports.V = exports.H = void 0;
// default resolution
exports.H = 1920;
exports.V = 1080;
// dwitter sim
exports.C = Math.cos;
exports.S = Math.sin;
exports.T = Math.tan;
exports.R = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
function mix(a, b, num) {
    return a.map((n, i) => n + (b[i] - n) * num);
}
exports.mix = mix;
// drawing functions
function randBackgroundFunc(rand) {
    const b = Math.floor(rand.random() * 2) * 255;
    const background = exports.R(b, b, b);
    return (x) => {
        x.fillStyle = background;
        x.fillRect(0, 0, exports.H, exports.V);
    };
}
exports.randBackgroundFunc = randBackgroundFunc;

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeBuilder = exports.channelSamplerName = void 0;
const expr_1 = require("./exprs/expr");
const webglprogramloop_1 = require("./webglprogramloop");
const settings_1 = require("./settings");
/** @ignore */
const FRAG_SET = `  gl_FragColor = texture2D(uSampler, gl_FragCoord.xy / uResolution);\n`;
/** @ignore */
const SCENE_SET = `uniform sampler2D uSceneSampler;\n`;
/** @ignore */
const TIME_SET = `uniform mediump float uTime;\n`;
/** @ignore */
const MOUSE_SET = `uniform mediump vec2 uMouse;\n`;
/** @ignore */
const COUNT_SET = `uniform int uCount;\n`;
/** @ignore */
const BOILERPLATE = `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uSampler;
uniform mediump vec2 uResolution;\n`;
/**
 * returns the string name of the sampler uniform for code generation purposes
 * @param num channel number to sample from
 */
function channelSamplerName(num) {
    // texture 2 sampler has number 0 (0 and 1 are used for back buffer and scene)
    return num === -1 ? "uSampler" : `uBufferSampler${num}`;
}
exports.channelSamplerName = channelSamplerName;
/**
 * returns the string of the declaration of the sampler for code generation
 * purposes
 * @param num channel number to sample from
 */
function channelSamplerDeclaration(num) {
    return `uniform sampler2D ${channelSamplerName(num)};`;
}
/** class that manages generation and compilation of GLSL code */
class CodeBuilder {
    constructor(effectLoop) {
        this.calls = [];
        this.externalFuncs = new Set();
        this.uniformDeclarations = new Set();
        this.counter = 0;
        this.baseLoop = effectLoop;
        const buildInfo = {
            uniformTypes: {},
            externalFuncs: new Set(),
            exprs: [],
            // update me on change to needs
            needs: {
                centerSample: false,
                neighborSample: false,
                sceneBuffer: false,
                timeUniform: false,
                mouseUniform: false,
                passCount: false,
                extraBuffers: new Set(),
            },
        };
        this.addEffectLoop(effectLoop, 1, buildInfo);
        // add all the types to uniform declarations from the `BuildInfo` instance
        for (const name in buildInfo.uniformTypes) {
            const typeName = buildInfo.uniformTypes[name];
            this.uniformDeclarations.add(`uniform mediump ${typeName} ${name};`);
        }
        // add all external functions from the `BuildInfo` instance
        buildInfo.externalFuncs.forEach((func) => this.externalFuncs.add(func));
        this.totalNeeds = buildInfo.needs;
        this.exprs = buildInfo.exprs;
    }
    addEffectLoop(effectLoop, indentLevel, buildInfo, topLevel = true) {
        const needsLoop = !topLevel && effectLoop.loopInfo.num > 1;
        if (needsLoop) {
            const iName = "i" + this.counter;
            indentLevel++;
            const forStart = "  ".repeat(indentLevel - 1) +
                `for (int ${iName} = 0; ${iName} < ${effectLoop.loopInfo.num}; ${iName}++) {`;
            this.calls.push(forStart);
        }
        for (const e of effectLoop.effects) {
            if (e instanceof expr_1.Expr) {
                e.parse(buildInfo);
                this.calls.push("  ".repeat(indentLevel) + "gl_FragColor = " + e.sourceCode + ";");
                this.counter++;
            }
            else {
                this.addEffectLoop(e, indentLevel, buildInfo, false);
            }
        }
        if (needsLoop) {
            this.calls.push("  ".repeat(indentLevel - 1) + "}");
        }
    }
    /** generate the code and compile the program into a loop */
    compileProgram(gl, vShader, uniformLocs, shaders = []) {
        // set up the fragment shader
        const fShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (fShader === null) {
            throw new Error("problem creating fragment shader");
        }
        const fullCode = BOILERPLATE +
            (this.totalNeeds.sceneBuffer ? SCENE_SET : "") +
            (this.totalNeeds.timeUniform ? TIME_SET : "") +
            (this.totalNeeds.mouseUniform ? MOUSE_SET : "") +
            (this.totalNeeds.passCount ? COUNT_SET : "") +
            Array.from(this.totalNeeds.extraBuffers)
                .map((n) => channelSamplerDeclaration(n))
                .join("\n") +
            "\n" +
            [...this.uniformDeclarations].join("\n") +
            "\n" +
            [...this.externalFuncs].join("\n") +
            "\n" +
            "void main() {\n" +
            (this.totalNeeds.centerSample ? FRAG_SET : "") +
            this.calls.join("\n") +
            "\n}";
        if (settings_1.settings.verbosity > 0)
            console.log(fullCode);
        gl.shaderSource(fShader, fullCode);
        gl.compileShader(fShader);
        // set up the program
        const program = gl.createProgram();
        if (program === null) {
            throw new Error("problem creating program");
        }
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        shaders.push(fShader);
        const shaderLog = (name, shader) => {
            const output = gl.getShaderInfoLog(shader);
            if (output)
                console.log(`${name} shader info log\n${output}`);
        };
        shaderLog("vertex", vShader);
        shaderLog("fragment", fShader);
        gl.linkProgram(program);
        // we need to use the program here so we can get uniform locations
        gl.useProgram(program);
        // find all uniform locations and add them to the dictionary
        for (const expr of this.exprs) {
            for (const name in expr.uniformValChangeMap) {
                const location = gl.getUniformLocation(program, name);
                if (location === null) {
                    throw new Error("couldn't find uniform " + name);
                }
                // TODO enforce unique names in the same program
                if (uniformLocs[name] === undefined) {
                    uniformLocs[name] = { locs: [], counter: 0 };
                }
                // assign the name to the location
                uniformLocs[name].locs.push(location);
            }
        }
        // set the uniform resolution (every program has this uniform)
        const uResolution = gl.getUniformLocation(program, "uResolution");
        gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
        if (this.totalNeeds.sceneBuffer) {
            // TODO allow for texture options for scene texture
            const location = gl.getUniformLocation(program, "uSceneSampler");
            // put the scene buffer in texture 1 (0 is used for the backbuffer)
            gl.uniform1i(location, 1 + settings_1.settings.offset);
        }
        // set all sampler uniforms
        for (const b of this.totalNeeds.extraBuffers) {
            const location = gl.getUniformLocation(program, channelSamplerName(b));
            // offset the texture location by 2 (0 and 1 are used for scene and original)
            gl.uniform1i(location, b + 2 + settings_1.settings.offset);
        }
        // set the default sampler if there is an offset
        if (settings_1.settings.offset !== 0) {
            const location = gl.getUniformLocation(program, "uSampler");
            gl.uniform1i(location, settings_1.settings.offset);
        }
        // TODO do we need to do this every time?
        // get attribute
        const position = gl.getAttribLocation(program, "aPosition");
        // enable the attribute
        gl.enableVertexAttribArray(position);
        // points to the vertices in the last bound array buffer
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        return new webglprogramloop_1.WebGLProgramLoop(new webglprogramloop_1.WebGLProgramLeaf(program, this.totalNeeds, this.exprs), this.baseLoop.loopInfo, gl);
    }
}
exports.CodeBuilder = CodeBuilder;

},{"./exprs/expr":27,"./settings":66,"./webglprogramloop":68}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a1 = exports.Arity1HomogenousExpr = void 0;
const expr_1 = require("./expr");
/** @ignore */
function genArity1SourceList(name, val) {
    return {
        sections: [name + "(", ")"],
        values: [val],
    };
}
/** arity 1 homogenous function expression */
class Arity1HomogenousExpr extends expr_1.Operator {
    constructor(val, operation) {
        super(val, genArity1SourceList(operation, val), ["uVal"]);
        this.val = val;
    }
    /** set the value being passed into the arity 1 homogenous function */
    setVal(val) {
        this.setUniform("uVal" + this.id, val);
        this.val = expr_1.wrapInValue(val);
    }
}
exports.Arity1HomogenousExpr = Arity1HomogenousExpr;
/**
 * built-in functions that take in one `genType x` and return a `genType x`
 * @param name function name (see [[Arity1HomogenousName]] for valid function names)
 * @param val the `genType x` argument
 */
function a1(name, val) {
    return new Arity1HomogenousExpr(expr_1.wrapInValue(val), name);
}
exports.a1 = a1;

},{"./expr":27}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.a2 = exports.Arity2HomogenousExpr = void 0;
const expr_1 = require("./expr");
// note: glsl has atan(y/x) as well as atan(y, x)
/** @ignore */
function genArity1SourceList(name, val1, val2) {
    return {
        sections: [name + "(", ",", ")"],
        values: [val1, val2],
    };
}
/** arity 2 homogenous function expression */
class Arity2HomogenousExpr extends expr_1.Operator {
    constructor(name, val1, val2) {
        super(val1, genArity1SourceList(name, val1, val2), ["uVal1", "uVal2"]);
        this.val1 = val1;
        this.val2 = val2;
    }
    /** set the first value being passed into the arity 2 homogenous function */
    setFirstVal(val1) {
        this.setUniform("uVal1" + this.id, val1);
        this.val1 = expr_1.wrapInValue(val1);
    }
    /** set the second value being passed into the arity 2 homogenous function */
    setSecondVal(val2) {
        this.setUniform("uVal2" + this.id, val2);
        this.val2 = expr_1.wrapInValue(val2);
    }
}
exports.Arity2HomogenousExpr = Arity2HomogenousExpr;
// implementation
/**
 * built-in functions that take in two `genType x` arguments and return a `genType x`
 * @param name function name (see [[Arity2HomogenousName]] for valid function names)
 * @param val1 the first `genType x` argument
 * @param val2 the second `genType x` argument
 */
function a2(name, val1, val2) {
    return new Arity2HomogenousExpr(name, expr_1.wrapInValue(val1), expr_1.wrapInValue(val2));
}
exports.a2 = a2;

},{"./expr":27}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloom = exports.BloomLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const brightnessexpr_1 = require("./brightnessexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const contrastexpr_1 = require("./contrastexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
// TODO bloom uses `input` so it has to be the first
// TODO maybe a way to update the scene buffer?
/** bloom loop */
class BloomLoop extends mergepass_1.EffectLoop {
    constructor(threshold = expr_1.float(expr_1.mut(0.4)), horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), boost = expr_1.float(expr_1.mut(1.3)), samplerNum = 1, taps = 9, reps = 3) {
        const bright = expr_1.cfloat(expr_1.tag `((${channelsampleexpr_1.channel(samplerNum)}.r + ${channelsampleexpr_1.channel(samplerNum)}.g + ${channelsampleexpr_1.channel(samplerNum)}.b) / 3.)`);
        const step = arity2_1.a2("step", bright, threshold);
        const col = expr_1.cvec4(expr_1.tag `vec4(${channelsampleexpr_1.channel(samplerNum)}.rgb * (1. - ${step}), 1.)`);
        const list = [
            mergepass_1.loop([col]).target(samplerNum),
            mergepass_1.loop([
                blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps),
                blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps),
                brightnessexpr_1.brightness(0.1),
                contrastexpr_1.contrast(boost),
            ], reps).target(samplerNum),
            opexpr_1.op(fragcolorexpr_1.fcolor(), "+", channelsampleexpr_1.channel(samplerNum)),
        ];
        super(list, { num: 1 });
        this.threshold = threshold;
        this.horizontal = horizontal;
        this.vertical = vertical;
        this.boost = boost;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
    /** set the treshold */
    setThreshold(num) {
        if (!(this.threshold instanceof expr_1.BasicFloat))
            throw new Error("threshold expression not basic float");
        this.threshold.setVal(num);
    }
    /** set the contrast boost */
    setBoost(num) {
        if (!(this.boost instanceof expr_1.BasicFloat))
            throw new Error("boost expression not basic float");
        this.boost.setVal(num);
    }
}
exports.BloomLoop = BloomLoop;
/**
 * creates a bloom loop
 * @param threshold values below this brightness don't get blurred (0.4 is
 * about reasonable, which is also the default)
 * @param horizontal how much to blur vertically (defaults to 1 pixel)
 * @param vertical how much to blur horizontally (defaults to 1 pixel)
 * @param taps how many taps for the blur (defaults to 9)
 * @param reps how many times to loop the blur (defaults to 3)
 */
function bloom(threshold, horizontal, vertical, boost, samplerNum, taps, reps) {
    return new BloomLoop(expr_1.wrapInValue(threshold), expr_1.wrapInValue(horizontal), expr_1.wrapInValue(vertical), expr_1.wrapInValue(boost), samplerNum, taps, reps);
}
exports.bloom = bloom;

},{"../mergepass":65,"./arity2":15,"./blurexpr":18,"./brightnessexpr":19,"./channelsampleexpr":21,"./contrastexpr":22,"./expr":27,"./fragcolorexpr":28,"./opexpr":45,"./vecexprs":61}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur2d = exports.Blur2dLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** 2D blur loop */
class Blur2dLoop extends mergepass_1.EffectLoop {
    constructor(horizontal = expr_1.float(expr_1.mut(1)), vertical = expr_1.float(expr_1.mut(1)), reps = 2, taps, samplerNum) {
        const side = blurexpr_1.gauss(vecexprs_1.vec2(horizontal, 0), taps, samplerNum);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, vertical), taps, samplerNum);
        super([side, up], { num: reps });
        this.horizontal = horizontal;
        this.vertical = vertical;
    }
    /**
     * set the horizontal stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setHorizontal(num) {
        if (!(this.horizontal instanceof expr_1.BasicFloat))
            throw new Error("horizontal expression not basic float");
        this.horizontal.setVal(num);
    }
    /**
     * set the vertical stretch of the blur effect (no greater than 1 for best
     * effect)
     */
    setVertical(num) {
        if (!(this.vertical instanceof expr_1.BasicFloat))
            throw new Error("vertical expression not basic float");
        this.vertical.setVal(num);
    }
}
exports.Blur2dLoop = Blur2dLoop;
/**
 * creates a loop that runs a horizontal, then vertical gaussian blur (anything
 * more than 1 pixel in the horizontal or vertical direction will create a
 * ghosting effect, which is usually not desirable)
 * @param horizontalExpr float for the horizontal blur (1 pixel default)
 * @param verticalExpr float for the vertical blur (1 pixel default)
 * @param reps how many passes (defaults to 2)
 * @param taps how many taps (defaults to 5)
 * @param samplerNum change if you want to sample from a different channel and
 * the outer loop has a different target
 */
function blur2d(horizontalExpr, verticalExpr, reps, taps, samplerNum) {
    return new Blur2dLoop(expr_1.wrapInValue(horizontalExpr), expr_1.wrapInValue(verticalExpr), reps, taps, samplerNum);
}
exports.blur2d = blur2d;

},{"../mergepass":65,"./blurexpr":18,"./expr":27,"./vecexprs":61}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gauss = exports.BlurExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** @ignore */
function genBlurSource(direction, taps) {
    return {
        sections: [`gauss${taps}(`, ")"],
        values: [direction],
    };
}
/** @ignore */
function tapsToFuncSource(taps) {
    switch (taps) {
        case 5:
            return glslfunctions_1.glslFuncs.gauss5;
        case 9:
            return glslfunctions_1.glslFuncs.gauss9;
        case 13:
            return glslfunctions_1.glslFuncs.gauss13;
    }
}
/** gaussian blur expression */
class BlurExpr extends expr_1.ExprVec4 {
    constructor(direction, taps = 5, samplerNum) {
        // this is already guaranteed by typescript, but creates helpful error for
        // use in gibber or anyone just using javascript
        if (![5, 9, 13].includes(taps)) {
            throw new Error("taps for gauss blur can only be 5, 9 or 13");
        }
        super(genBlurSource(direction, taps), ["uDirection"]);
        this.direction = direction;
        this.externalFuncs = [tapsToFuncSource(taps)];
        this.brandExprWithChannel(0, samplerNum);
    }
    /** set the blur direction (keep magnitude no greater than 1 for best effect) */
    setDirection(direction) {
        this.setUniform("uDirection" + this.id, direction);
        this.direction = direction;
    }
}
exports.BlurExpr = BlurExpr;
/**
 * creates expression that performs one pass of a gaussian blur
 * @param direction direction to blur (keep magnitude less than or equal to 1
 * for best effect)
 * @param taps number of taps (defaults to 5)
 * @param samplerNum which channel to sample from (default 0)
 */
function gauss(direction, taps = 5, samplerNum) {
    return new BlurExpr(direction, taps, samplerNum);
}
exports.gauss = gauss;

},{"../glslfunctions":63,"./expr":27}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brightness = exports.Brightness = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
/** brightness expression */
class Brightness extends expr_1.ExprVec4 {
    constructor(brightness, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `brightness(${brightness}, ${col})`, ["uBrightness", "uColor"]);
        this.brightness = brightness;
        this.externalFuncs = [glslfunctions_1.glslFuncs.brightness];
    }
    /** set the brightness (should probably be between -1 and 1) */
    setBrightness(brightness) {
        this.setUniform("uBrightness" + this.id, brightness);
        this.brightness = expr_1.wrapInValue(brightness);
    }
}
exports.Brightness = Brightness;
/**
 * changes the brightness of a color
 * @param val float for how much to change the brightness by (should probably be
 * between -1 and 1)
 * @param col the color to increase the brightness of (defaults to current
 * fragment color)
 */
function brightness(val, col) {
    return new Brightness(expr_1.wrapInValue(val), col);
}
exports.brightness = brightness;

},{"../glslfunctions":63,"./expr":27,"./fragcolorexpr":28}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changecomp = exports.ChangeCompExpr = void 0;
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
/** @ignore */
function getChangeFunc(typ, id, setter, comps, op = "") {
    return `${typ} changecomp_${id}(${typ} col, ${setter.typeString()} setter) {
  col.${comps} ${op}= setter;
  return col;
}`;
}
/**
 * throws a runtime error if component access is not valid, and disallows
 * duplicate components because duplicate components can not be in a left
 * expression. (for example `v.xyx = vec3(1., 2., 3.)` is illegal, but `v1.xyz
 * = v2.xyx` is legal.) also checks for type errors such as `v1.xy = vec3(1.,
 * 2., 3.)`; the right hand side can only be a `vec2` if only two components
 * are supplied
 * @param comps component string
 * @param setter how the components are being changed
 * @param vec the vector where components are being accessed
 */
function checkChangeComponents(comps, setter, vec) {
    // setter has different length than components
    if (comps.length !== getcompexpr_1.typeStringToLength(setter.typeString())) {
        throw new Error("components length must be equal to the target float/vec");
    }
    // duplicate components
    if (duplicateComponents(comps)) {
        throw new Error("duplicate components not allowed on left side");
    }
    // legal components
    getcompexpr_1.checkLegalComponents(comps, vec);
}
/** @ignore */
function duplicateComponents(comps) {
    return new Set(comps.split("")).size !== comps.length;
}
/** change component expression */
class ChangeCompExpr extends expr_1.Operator {
    constructor(vec, setter, comps, op) {
        checkChangeComponents(comps, setter, vec);
        // part of name of custom function
        const operation = op === "+"
            ? "plus"
            : op === "-"
                ? "minus"
                : op === "*"
                    ? "mult"
                    : op === "/"
                        ? "div"
                        : "assign";
        const suffix = `${vec.typeString()}_${setter.typeString()}_${comps}_${operation}`;
        super(vec, { sections: [`changecomp_${suffix}(`, ", ", ")"], values: [vec, setter] }, ["uOriginal", "uNew"]);
        this.originalVec = vec;
        this.newVal = setter;
        this.externalFuncs = [
            getChangeFunc(vec.typeString(), suffix, setter, comps, op),
        ];
    }
    /** set the original vector */
    setOriginal(originalVec) {
        this.setUniform("uOriginal" + this.id, originalVec);
        this.originalVec = originalVec;
    }
    /** set the neww vector */
    setNew(newVal) {
        this.setUniform("uNew" + this.id, newVal);
        this.newVal = expr_1.wrapInValue(newVal);
    }
}
exports.ChangeCompExpr = ChangeCompExpr;
/**
 * change the components of a vector
 * @param vec the vector to augment components of
 * @param setter the vector (or float, if only one component is changed) for
 * how to change the components
 * @param comps string representing the components to change (e.g. `"xy"` or
 * `"r"` or `"stpq"`.)
 * @param op optionally perform an operation on the original component
 * (defaults to no operation, just assigning that component to a new value)
 */
function changecomp(vec, setter, comps, op) {
    return new ChangeCompExpr(vec, expr_1.wrapInValue(setter), comps, op);
}
exports.changecomp = changecomp;

},{"./expr":27,"./getcompexpr":32}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channel = exports.ChannelSampleExpr = void 0;
const codebuilder_1 = require("../codebuilder");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const glslfunctions_1 = require("../glslfunctions");
/** @ignore */
function genChannelSampleSource(buf, coord) {
    return {
        sections: ["channel(", `, ${codebuilder_1.channelSamplerName(buf)})`],
        values: [coord],
    };
}
// TODO create a way to sample but not clamp by region
/** channel sample expression */
class ChannelSampleExpr extends expr_1.ExprVec4 {
    constructor(buf, coord = normfragcoordexpr_1.pos()) {
        super(genChannelSampleSource(buf, coord), ["uVec"]);
        this.coord = coord;
        this.externalFuncs = [glslfunctions_1.glslFuncs.channel];
        if (buf !== -1)
            this.needs.extraBuffers = new Set([buf]);
        else
            this.needs.neighborSample = true;
    }
    setCoord(coord) {
        this.setUniform("uVec", coord);
        this.coord = coord;
    }
}
exports.ChannelSampleExpr = ChannelSampleExpr;
/**
 * creates an expression that samples from one of the user-defined channels.
 * don't sample from the same channel that you are using [[target]] on in a
 * loop, just use [[fcolor]]
 * @param channel which channel to sample from
 * @param vec where to sample the channel texture (defaults to the normalized
 * frag coord)
 */
function channel(channel, vec) {
    return new ChannelSampleExpr(channel, vec);
}
exports.channel = channel;

},{"../codebuilder":13,"../glslfunctions":63,"./expr":27,"./normfragcoordexpr":43}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contrast = exports.ContrastExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
class ContrastExpr extends expr_1.ExprVec4 {
    constructor(contrast, col = fragcolorexpr_1.fcolor()) {
        super(expr_1.tag `contrast(${contrast}, ${col})`, ["uVal", "uCol"]);
        this.contrast = contrast;
        this.externalFuncs = [glslfunctions_1.glslFuncs.contrast];
    }
    /** sets the contrast */
    setContrast(contrast) {
        this.setUniform("uContrast" + this.id, contrast);
        this.contrast = expr_1.wrapInValue(contrast);
    }
}
exports.ContrastExpr = ContrastExpr;
/**
 * changes the contrast of a color
 * @param val float for how much to change the contrast by (should probably be
 * between -1 and 1)
 * @param col the color to increase the contrast of (defaults to current
 * fragment color)
 */
function contrast(val, col) {
    return new ContrastExpr(expr_1.wrapInValue(val), col);
}
exports.contrast = contrast;

},{"../glslfunctions":63,"./expr":27,"./fragcolorexpr":28}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depth2occlusion = exports.DepthToOcclusionExpr = void 0;
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const vecexprs_1 = require("./vecexprs");
/** depth info to occlussion info expression */
class DepthToOcclusionExpr extends expr_1.ExprVec4 {
    constructor(depthCol = channelsampleexpr_1.channel(0), newCol = expr_1.mut(vecexprs_1.pvec4(1, 1, 1, 1)), threshold = expr_1.mut(expr_1.pfloat(0.01))) {
        super(expr_1.tag `depth2occlusion(${depthCol}, ${newCol}, ${threshold})`, [
            "uDepth",
            "uNewCol",
            "uThreshold",
        ]);
        this.depthCol = depthCol;
        this.newCol = newCol;
        this.threshold = threshold;
    }
    setDepthColor(depthCol) {
        this.setUniform("uDepth" + this.id, depthCol);
        this.depthCol = depthCol;
    }
    setNewColor(newCol) {
        this.setUniform("uNewCol" + this.id, newCol);
        this.newCol = newCol;
    }
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
}
exports.DepthToOcclusionExpr = DepthToOcclusionExpr;
/**
 * converts a `1 / distance` depth texture to an occlusion texture, with all
 * occluded geometry being rendered as black
 * @param depthCol the color representing the inverse depth (defaults to
 * sampling from channel 0)
 * @param newCol the color to replace unoccluded areas by (defaults to white
 * and is mutable by default)
 * @param threshold values below this are not occluded (set to something low,
 * like 0.1 or lower; defaults to 0.01 and is mutable by default)
 */
function depth2occlusion(depthCol, newCol, threshold) {
    return new DepthToOcclusionExpr(depthCol, newCol, expr_1.wrapInValue(threshold));
}
exports.depth2occlusion = depth2occlusion;

},{"./channelsampleexpr":21,"./expr":27,"./vecexprs":61}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dof = exports.DoFLoop = void 0;
const mergepass_1 = require("../mergepass");
const arity2_1 = require("./arity2");
const blurexpr_1 = require("./blurexpr");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const gaussianexpr_1 = require("./gaussianexpr");
const getcompexpr_1 = require("./getcompexpr");
const opexpr_1 = require("./opexpr");
const vecexprs_1 = require("./vecexprs");
class DoFLoop extends mergepass_1.EffectLoop {
    constructor(depth = expr_1.mut(expr_1.pfloat(0.3)), rad = expr_1.mut(expr_1.pfloat(0.01)), depthInfo = getcompexpr_1.getcomp(channelsampleexpr_1.channel(0), "r"), reps = 2, taps = 13) {
        let guassianExpr = gaussianexpr_1.gaussian(depthInfo, depth, rad);
        const side = blurexpr_1.gauss(vecexprs_1.vec2(arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4), 0), taps);
        const up = blurexpr_1.gauss(vecexprs_1.vec2(0, arity2_1.a2("pow", opexpr_1.op(1, "-", guassianExpr), 4)), taps);
        super([side, up], { num: reps });
        this.gaussian = guassianExpr;
    }
    setDepth(depth) {
        // this translates the gaussian curve to the side
        this.gaussian.setA(depth);
    }
    setRadius(radius) {
        // this scales the gaussian curve to focus on a larger band of depth
        this.gaussian.setB(radius);
    }
}
exports.DoFLoop = DoFLoop;
/**
 * creates depth of field expression; all values are mutable by default
 * @param depth float for what inverse depth to focus on (1 on top of the
 * camera; 0 is infinity)
 * @param rad float for how deep the band of in-focus geometry is (a value
 * between 0.01 and 0.1 is reasonable)
 * @param depthInfo float the expression that represents the inverse depth
 * (defaults to sampling the red component from channel 0)
 * @param reps how many times to repeat the gaussian blur
 */
function dof(depth, rad, depthInfo, reps) {
    return new DoFLoop(expr_1.wrapInValue(depth), expr_1.wrapInValue(rad), expr_1.wrapInValue(depthInfo), reps);
}
exports.dof = dof;

},{"../mergepass":65,"./arity2":15,"./blurexpr":18,"./channelsampleexpr":21,"./expr":27,"./gaussianexpr":31,"./getcompexpr":32,"./opexpr":45,"./vecexprs":61}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edgecolor = exports.EdgeColorExpr = void 0;
const arity2_1 = require("./arity2");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const sobelexpr_1 = require("./sobelexpr");
const vecexprs_1 = require("./vecexprs");
/** edge color expression */
class EdgeColorExpr extends expr_1.WrappedExpr {
    constructor(color, samplerNum, stepped = true) {
        const expr = stepped
            ? expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(arity2_1.a2("step", vecexprs_1.vec4(0.5, 0.5, 0.5, 0.0), sobelexpr_1.sobel(samplerNum)))})`)
            : expr_1.cvec4(expr_1.tag `mix(${color}, ${fragcolorexpr_1.fcolor()}, ${monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))})`);
        super(expr);
        this.color = color;
        this.expr = expr;
    }
    setColor(color) {
        this.expr.setUniform("uCustomName0" + this.expr.id, color);
        this.color = color;
    }
}
exports.EdgeColorExpr = EdgeColorExpr;
/**
 * creates a colored edge detection expression
 * @param color what color to make the edge
 * @param samplerNum where to sample from
 * @param stepped whether to round the result of sobel edge detection (defaults
 * to true)
 */
function edgecolor(color, samplerNum, stepped) {
    return new EdgeColorExpr(color, samplerNum, stepped);
}
exports.edgecolor = edgecolor;

},{"./arity2":15,"./expr":27,"./fragcolorexpr":28,"./monochromeexpr":38,"./sobelexpr":56,"./vecexprs":61}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edge = exports.EdgeExpr = void 0;
const brightnessexpr_1 = require("./brightnessexpr");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const invertexpr_1 = require("./invertexpr");
const monochromeexpr_1 = require("./monochromeexpr");
const opexpr_1 = require("./opexpr");
const sobelexpr_1 = require("./sobelexpr");
class EdgeExpr extends expr_1.WrappedExpr {
    constructor(mult = expr_1.mut(-1.0), samplerNum) {
        const operator = opexpr_1.op(getcompexpr_1.getcomp(invertexpr_1.invert(monochromeexpr_1.monochrome(sobelexpr_1.sobel(samplerNum))), "r"), "*", mult);
        super(brightnessexpr_1.brightness(operator));
        this.mult = mult;
        this.operator = operator;
    }
    setMult(mult) {
        this.operator.setRight(mult);
        this.mult = expr_1.wrapInValue(mult);
    }
}
exports.EdgeExpr = EdgeExpr;
/**
 * returns an expression highlights edges where they appear
 * @param style `"dark"` for dark edges and `"light"` for light edges, or a
 * custom number or expression (between -1 and 1) for a more gray style of edge
 * @param samplerNum where to sample from
 */
function edge(style, samplerNum) {
    const mult = style === "dark" ? -1 : style === "light" ? 1 : style;
    return new EdgeExpr(expr_1.wrapInValue(mult), samplerNum);
}
exports.edge = edge;

},{"./brightnessexpr":19,"./expr":27,"./getcompexpr":32,"./invertexpr":36,"./monochromeexpr":38,"./opexpr":45,"./sobelexpr":56}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tag = exports.wrapInValue = exports.pfloat = exports.Operator = exports.WrappedExpr = exports.ExprVec4 = exports.ExprVec3 = exports.ExprVec2 = exports.float = exports.ExprFloat = exports.BasicFloat = exports.ExprVec = exports.BasicVec4 = exports.BasicVec3 = exports.BasicVec2 = exports.BasicVec = exports.PrimitiveVec4 = exports.PrimitiveVec3 = exports.PrimitiveVec2 = exports.PrimitiveVec = exports.PrimitiveFloat = exports.Primitive = exports.mut = exports.Mutable = exports.cvec4 = exports.cvec3 = exports.cvec2 = exports.cfloat = exports.Expr = void 0;
const mergepass_1 = require("../mergepass");
const webglprogramloop_1 = require("../webglprogramloop");
const utils_1 = require("../utils");
/**
 * adds a `.` after a number if needed (e.g converts `1` to `"1."` but leaves
 * `1.2` as `"1.2"`)
 * @param num number to convert
 */
function toGLSLFloatString(num) {
    let str = "" + num;
    if (!str.includes("."))
        str += ".";
    return str;
}
class Expr {
    constructor(sourceLists, defaultNames) {
        // update me on change to needs
        this.needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        this.uniformValChangeMap = {};
        this.defaultNameMap = {};
        this.externalFuncs = [];
        this.sourceCode = "";
        this.funcIndex = 0;
        this.regionBranded = false;
        this.id = "_id_" + Expr.count;
        Expr.count++;
        if (sourceLists.sections.length - sourceLists.values.length !== 1) {
            // this cannot happen if you use `tag` to destructure a template string
            throw new Error("wrong lengths for source and values");
        }
        if (sourceLists.values.length !== defaultNames.length) {
            console.log(sourceLists);
            console.log(defaultNames);
            throw new Error("default names list length doesn't match values list length");
        }
        this.sourceLists = sourceLists;
        this.defaultNames = defaultNames;
    }
    applyUniforms(gl, uniformLocs) {
        for (const name in this.uniformValChangeMap) {
            const loc = uniformLocs[name];
            if (this.uniformValChangeMap[name].changed) {
                //this.uniformValChangeMap[name].changed = false;
                this.uniformValChangeMap[name].val.applyUniform(gl, loc.locs[loc.counter]);
            }
            // increment and reset the counter to wrap back around to first location
            loc.counter++;
            loc.counter %= loc.locs.length;
            // once we have wrapped then we know all uniforms have been changed
            if (loc.counter === 0) {
                this.uniformValChangeMap[name].changed = false;
            }
        }
    }
    getSampleNum(mult = 1) {
        return this.needs.neighborSample
            ? mult
            : this.sourceLists.values
                .map((v) => v.getSampleNum())
                .reduce((acc, curr) => acc + curr, 0);
    }
    /**
     * set a uniform by name directly
     * @param name uniform name in the source code
     * @param newVal value to set the uniform to
     */
    setUniform(name, newVal) {
        var _a, _b;
        newVal = wrapInValue(newVal);
        const originalName = name;
        if (typeof newVal === "number") {
            newVal = wrapInValue(newVal);
        }
        if (!(newVal instanceof Primitive)) {
            throw new Error("cannot set a non-primitive");
        }
        // if name does not exist, try mapping default name to new name
        if (((_a = this.uniformValChangeMap[name]) === null || _a === void 0 ? void 0 : _a.val) === undefined) {
            name = this.defaultNameMap[name];
        }
        const oldVal = (_b = this.uniformValChangeMap[name]) === null || _b === void 0 ? void 0 : _b.val;
        if (oldVal === undefined) {
            throw new Error("tried to set uniform " +
                name +
                " which doesn't exist. original name: " +
                originalName);
        }
        if (oldVal.typeString() !== newVal.typeString()) {
            throw new Error("tried to set uniform " + name + " to a new type");
        }
        this.uniformValChangeMap[name].val = newVal;
        this.uniformValChangeMap[name].changed = true;
    }
    /**
     * parses this expression into a string, adding info as it recurses into
     * nested expressions
     */
    parse(buildInfo) {
        this.sourceCode = "";
        buildInfo.exprs.push(this);
        buildInfo.needs = webglprogramloop_1.updateNeeds(buildInfo.needs, this.needs);
        // add each of the external funcs to the builder
        this.externalFuncs.forEach((func) => buildInfo.externalFuncs.add(func));
        // put all of the values between all of the source sections
        for (let i = 0; i < this.sourceLists.values.length; i++) {
            this.sourceCode +=
                this.sourceLists.sections[i] +
                    this.sourceLists.values[i].parse(buildInfo, this.defaultNames[i], this);
        }
        // TODO does sourceCode have to be a member?
        this.sourceCode += this.sourceLists.sections[this.sourceLists.sections.length - 1];
        return this.sourceCode;
    }
    addFuncs(funcs) {
        this.externalFuncs.push(...funcs);
        return this;
    }
    brandExprWithChannel(funcIndex, samplerNum) {
        utils_1.brandWithChannel(this.sourceLists, this.externalFuncs, this.needs, funcIndex, samplerNum);
        return this;
    }
    brandExprWithRegion(space) {
        utils_1.brandWithRegion(this, this.funcIndex, space);
        for (const v of this.sourceLists.values) {
            v.brandExprWithRegion(space);
        }
        return this;
    }
}
exports.Expr = Expr;
/**
 * increments for each expression created; used to uniquely id each expression
 */
Expr.count = 0;
function genCustomNames(sourceLists) {
    const names = [];
    for (let i = 0; i < sourceLists.values.length; i++) {
        names.push("uCustomName" + i);
    }
    return names;
}
/** create a custom float function (use with [[tag]]) */
function cfloat(sourceLists, externalFuncs = []) {
    return new ExprFloat(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cfloat = cfloat;
/** create a custom vec2 function (use with [[tag]]) */
function cvec2(sourceLists, externalFuncs = []) {
    return new ExprVec2(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec2 = cvec2;
/** create a custom vec3 function (use with [[tag]]) */
function cvec3(sourceLists, externalFuncs = []) {
    return new ExprVec3(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec3 = cvec3;
/** create a custom vec4 function (use with [[tag]]) */
function cvec4(sourceLists, externalFuncs = []) {
    return new ExprVec4(sourceLists, genCustomNames(sourceLists)).addFuncs(externalFuncs);
}
exports.cvec4 = cvec4;
class Mutable {
    constructor(primitive, name) {
        this.primitive = primitive;
        this.name = name;
    }
    parse(buildInfo, defaultName, enc) {
        if (enc === undefined) {
            throw new Error("tried to put a mutable expression at the top level");
        }
        // accept the default name if given no name
        if (this.name === undefined)
            this.name = defaultName + enc.id;
        // set to true so they are set to their default values on first draw
        buildInfo.uniformTypes[this.name] = this.primitive.typeString();
        // add the name mapping
        enc.uniformValChangeMap[this.name] = {
            val: this.primitive,
            changed: true,
        };
        // add the new type to the map
        enc.defaultNameMap[defaultName + enc.id] = this.name;
        return this.name;
    }
    applyUniform(gl, loc) {
        this.primitive.applyUniform(gl, loc);
    }
    typeString() {
        return this.primitive.typeString();
    }
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
    }
}
exports.Mutable = Mutable;
/**
 * makes a primitive value mutable. wrapping a [[PrimitiveVec]] or
 * [[PrimitiveFloat]] in [[mut]] before passing it into an expression will
 * allow you to use the setters on that expression to change those values at
 * runtime
 * @param val the primitive float or primitive vec to make mutable
 * @param name the optional name for the uniform
 */
function mut(val, name) {
    const primitive = typeof val === "number" ? wrapInValue(val) : val;
    return new Mutable(primitive, name);
}
exports.mut = mut;
class Primitive {
    parse() {
        return this.toString();
    }
    getSampleNum() {
        return 0;
    }
    brandExprWithRegion(space) {
        return this;
    }
}
exports.Primitive = Primitive;
class PrimitiveFloat extends Primitive {
    constructor(num) {
        if (!isFinite(num))
            throw new Error("number not finite");
        super();
        this.value = num;
    }
    toString() {
        let str = "" + this.value;
        if (!str.includes("."))
            str += ".";
        return str;
    }
    typeString() {
        return "float";
    }
    applyUniform(gl, loc) {
        gl.uniform1f(loc, this.value);
    }
}
exports.PrimitiveFloat = PrimitiveFloat;
class PrimitiveVec extends Primitive {
    constructor(comps) {
        super();
        this.values = comps;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    toString() {
        return `${this.typeString()}(${this.values
            .map((n) => toGLSLFloatString(n))
            .join(", ")})`;
    }
}
exports.PrimitiveVec = PrimitiveVec;
class PrimitiveVec2 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform2f(loc, this.values[0], this.values[1]);
    }
}
exports.PrimitiveVec2 = PrimitiveVec2;
class PrimitiveVec3 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform3f(loc, this.values[0], this.values[1], this.values[2]);
    }
}
exports.PrimitiveVec3 = PrimitiveVec3;
class PrimitiveVec4 extends PrimitiveVec {
    applyUniform(gl, loc) {
        gl.uniform4f(loc, this.values[0], this.values[1], this.values[2], this.values[3]);
    }
}
exports.PrimitiveVec4 = PrimitiveVec4;
class BasicVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        // this cast is fine as long as you only instantiate these with the
        // shorthand version and not the constructor
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
    typeString() {
        return ("vec" + this.values.length);
    }
    /** sets a component of the vector */
    setComp(index, primitive) {
        if (index < 0 || index >= this.values.length) {
            throw new Error("out of bounds of setting component");
        }
        this.setUniform(this.defaultNames[index] + this.id, wrapInValue(primitive));
    }
}
exports.BasicVec = BasicVec;
class BasicVec2 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec2 = undefined; // brand for nominal typing
    }
}
exports.BasicVec2 = BasicVec2;
class BasicVec3 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec3 = undefined; // brand for nominal typing
    }
}
exports.BasicVec3 = BasicVec3;
class BasicVec4 extends BasicVec {
    constructor() {
        super(...arguments);
        this.bvec4 = undefined; // brand for nominal typing
    }
}
exports.BasicVec4 = BasicVec4;
class ExprVec extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        const values = sourceLists.values;
        this.values = values;
        this.defaultNames = defaultNames;
    }
}
exports.ExprVec = ExprVec;
class BasicFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.BasicFloat = BasicFloat;
class ExprFloat extends Expr {
    constructor(sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.float = undefined; // brand for nominal typing
    }
    setVal(primitive) {
        this.setUniform("uFloat" + this.id, wrapInValue(primitive));
    }
    typeString() {
        return "float";
    }
}
exports.ExprFloat = ExprFloat;
function float(value) {
    if (typeof value === "number")
        value = wrapInValue(value);
    return new BasicFloat({ sections: ["", ""], values: [value] }, ["uFloat"]);
}
exports.float = float;
class ExprVec2 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec2 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec2";
    }
}
exports.ExprVec2 = ExprVec2;
class ExprVec3 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec3 = undefined; // brand for nominal typing
    }
    typeString() {
        return "vec3";
    }
}
exports.ExprVec3 = ExprVec3;
class ExprVec4 extends ExprVec {
    constructor() {
        super(...arguments);
        this.vec4 = undefined; // brand for nominal typing
    }
    repeat(num) {
        return new mergepass_1.EffectLoop([this], { num: num });
    }
    genPrograms(gl, vShader, uniformLocs, shaders) {
        return new mergepass_1.EffectLoop([this], { num: 1 }).genPrograms(gl, vShader, uniformLocs, shaders);
    }
    typeString() {
        return "vec4";
    }
}
exports.ExprVec4 = ExprVec4;
class WrappedExpr {
    constructor(expr) {
        this.expr = expr;
    }
    typeString() {
        return this.expr.typeString();
    }
    parse(buildInfo, defaultName, enc) {
        return this.expr.parse(buildInfo, defaultName, enc);
    }
    getSampleNum() {
        return this.expr.getSampleNum();
    }
    brandExprWithRegion(space) {
        return this.expr.brandExprWithRegion(space);
    }
}
exports.WrappedExpr = WrappedExpr;
class Operator extends Expr {
    constructor(ret, sourceLists, defaultNames) {
        super(sourceLists, defaultNames);
        this.ret = ret;
    }
    typeString() {
        return this.ret.typeString();
    }
}
exports.Operator = Operator;
/** creates a primitive float */
function pfloat(num) {
    return new PrimitiveFloat(num);
}
exports.pfloat = pfloat;
function wrapInValue(num) {
    if (num === undefined)
        return undefined;
    if (typeof num === "number")
        return pfloat(num);
    return num;
}
exports.wrapInValue = wrapInValue;
/**
 * takes a template strings array and converts it to a source list; very useful
 * for [[cfloat]], [[cvec2]], [[cvec3]] and [[cvec4]]
 */
function tag(strings, ...values) {
    return { sections: strings.concat([]), values: values };
}
exports.tag = tag;

},{"../mergepass":65,"../utils":67,"../webglprogramloop":68}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fcolor = exports.FragColorExpr = void 0;
const expr_1 = require("./expr");
/** fragment color expression */
class FragColorExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `gl_FragColor`, []);
        this.needs.centerSample = true;
    }
}
exports.FragColorExpr = FragColorExpr;
/** creates an expression that evaluates to the fragment color */
function fcolor() {
    return new FragColorExpr();
}
exports.fcolor = fcolor;

},{"./expr":27}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pixel = exports.FragCoordExpr = void 0;
const expr_1 = require("./expr");
/** frag coord expression (xy components only) */
class FragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `gl_FragCoord.xy`, []);
    }
}
exports.FragCoordExpr = FragCoordExpr;
/**
 * creates an expression that evaluates to the frag coord in pixels (samplers
 * take normalized coordinates, so you might want [[nfcoord]] instead)
 */
function pixel() {
    return new FragCoordExpr();
}
exports.pixel = pixel;

},{"./expr":27}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fxaa = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** FXAA expression */
class FXAAExpr extends expr_1.ExprVec4 {
    constructor() {
        super(expr_1.tag `fxaa()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.fxaa];
        this.needs.neighborSample = true;
    }
}
/** FXAA antaliasing expression */
function fxaa() {
    return new FXAAExpr();
}
exports.fxaa = fxaa;

},{"../glslfunctions":63,"./expr":27}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gaussian = exports.GaussianExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** gaussian expression */
class GaussianExpr extends expr_1.ExprFloat {
    constructor(x, a, b) {
        super(expr_1.tag `gaussian(${x}, ${a}, ${b})`, ["uFloatX", "uFloatA", "uFloatB"]);
        this.x = x;
        this.a = a;
        this.b = b;
        this.externalFuncs = [glslfunctions_1.glslFuncs.gaussian];
    }
    setX(x) {
        this.setUniform("uFloatX" + this.id, x);
        this.x = expr_1.wrapInValue(x);
    }
    setA(a) {
        this.setUniform("uFloatA" + this.id, a);
        this.a = expr_1.wrapInValue(a);
    }
    setB(b) {
        this.setUniform("uFloatB" + this.id, b);
        this.b = expr_1.wrapInValue(b);
    }
}
exports.GaussianExpr = GaussianExpr;
/**
 * gaussian function that defaults to normal distribution
 * @param x x position in the curve
 * @param a horizontal position of peak (defaults to 0 for normal distribution)
 * @param b horizontal stretch of the curve (defaults to 1 for normal distribution)
 */
function gaussian(x, a = 0, b = 1) {
    return new GaussianExpr(expr_1.wrapInValue(x), expr_1.wrapInValue(a), expr_1.wrapInValue(b));
}
exports.gaussian = gaussian;

},{"../glslfunctions":63,"./expr":27}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get4comp = exports.get3comp = exports.get2comp = exports.getcomp = exports.Get4CompExpr = exports.Get3CompExpr = exports.Get2CompExpr = exports.GetCompExpr = exports.checkLegalComponents = exports.typeStringToLength = void 0;
const expr_1 = require("./expr");
// TODO this should probably be somewhere else
/** @ignore */
function typeStringToLength(str) {
    switch (str) {
        case "float":
            return 1;
        case "vec2":
            return 2;
        case "vec3":
            return 3;
        case "vec4":
            return 4;
    }
}
exports.typeStringToLength = typeStringToLength;
/** @ignore */
function genCompSource(vec, components) {
    return {
        sections: ["", "." + components],
        values: [vec],
    };
}
/**
 * checks if components accessing a vector are legal. components can be illegal
 * if they mix sets (e.g. `v.rgzw`) or contain characters outside of any set
 * (e.g. `v.lmno`)
 * @param comps components string
 * @param vec vector being accessed
 */
function checkLegalComponents(comps, vec) {
    const check = (range, domain) => {
        let inside = 0;
        let outside = 0;
        for (const c of range) {
            domain.includes(c) ? inside++ : outside++;
        }
        return inside === inside && !outside;
    };
    const inLen = typeStringToLength(vec.typeString());
    const rgbaCheck = check(comps, "rgba".substr(0, inLen));
    const xyzwCheck = check(comps, "xyzw".substr(0, inLen));
    const stpqCheck = check(comps, "stpq".substr(0, inLen));
    if (!(rgbaCheck || xyzwCheck || stpqCheck)) {
        throw new Error("component sets are mixed or incorrect entirely");
    }
}
exports.checkLegalComponents = checkLegalComponents;
/**
 * performs all validity checks of [[checkLegalComponents]] and checks if the
 * number of accessed components does not exceed the size of the vector being
 * assigned to
 * @param comps components string
 * @param outLen length of the resultant vector
 * @param vec vector being accessed
 */
function checkGetComponents(comps, outLen, vec) {
    if (comps.length > outLen)
        throw new Error("too many components");
    checkLegalComponents(comps, vec);
}
/** get component expression */
class GetCompExpr extends expr_1.ExprFloat {
    constructor(vec, comps) {
        checkGetComponents(comps, 1, vec);
        super(genCompSource(vec, comps), ["uVec1Min"]);
        this.vec1Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec1Min", vec);
        this.vec1Min = vec;
    }
}
exports.GetCompExpr = GetCompExpr;
/** get 2 components expression */
class Get2CompExpr extends expr_1.ExprVec2 {
    constructor(vec, comps) {
        checkGetComponents(comps, 2, vec);
        super(genCompSource(vec, comps), ["uVec2Min"]);
        this.vec2Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec2Min", vec);
        this.vec2Min = vec;
    }
}
exports.Get2CompExpr = Get2CompExpr;
/** get 3 components expression */
class Get3CompExpr extends expr_1.ExprVec3 {
    constructor(vec, comps) {
        checkGetComponents(comps, 3, vec);
        super(genCompSource(vec, comps), ["uVec3Min"]);
        this.vec3Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec3Min", vec);
        this.vec3Min = vec;
    }
}
exports.Get3CompExpr = Get3CompExpr;
/** get 3 components expression */
class Get4CompExpr extends expr_1.ExprVec4 {
    constructor(vec, comps) {
        checkGetComponents(comps, 4, vec);
        super(genCompSource(vec, comps), ["uVec4Min"]);
        this.vec4Min = vec;
    }
    setVec(vec) {
        this.setUniform("uVec4Min", vec);
        this.vec4Min = vec;
    }
}
exports.Get4CompExpr = Get4CompExpr;
/**
 * creates an expression that gets 1 component from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function getcomp(vec, comps) {
    return new GetCompExpr(vec, comps);
}
exports.getcomp = getcomp;
/**
 * creates an expression that gets 2 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get2comp(vec, comps) {
    return new Get2CompExpr(vec, comps);
}
exports.get2comp = get2comp;
/**
 * creates an expression that gets 3 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get3comp(vec, comps) {
    return new Get3CompExpr(vec, comps);
}
exports.get3comp = get3comp;
/**
 * creates an expression that gets 4 components from a vector
 * @param vec the vector to get components of
 * @param comps components string
 */
function get4comp(vec, comps) {
    return new Get4CompExpr(vec, comps);
}
exports.get4comp = get4comp;

},{"./expr":27}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.godrays = exports.GodRaysExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const vecexprs_1 = require("./vecexprs");
/**
 * @ignore
 * the number of samples in the source code already
 */
const DEFAULT_SAMPLES = 100;
/** godrays expression */
class GodRaysExpr extends expr_1.ExprVec4 {
    // sane godray defaults from https://github.com/Erkaman/glsl-godrays/blob/master/example/index.js
    constructor(col = fragcolorexpr_1.fcolor(), exposure = expr_1.mut(1.0), decay = expr_1.mut(1.0), density = expr_1.mut(1.0), weight = expr_1.mut(0.01), lightPos = expr_1.mut(vecexprs_1.pvec2(0.5, 0.5)), samplerNum = 0, numSamples = DEFAULT_SAMPLES, convertDepth) {
        // TODO the metaprogramming here is not so good!
        // leaving off the function call section for now (we addd it back later)
        const sourceLists = expr_1.tag `${col}, ${exposure}, ${decay}, ${density}, ${weight}, ${lightPos}, ${convertDepth !== undefined ? convertDepth.threshold : expr_1.float(0)}, ${convertDepth !== undefined ? convertDepth.newColor : vecexprs_1.vec4(0, 0, 0, 0)})`;
        // TODO make this more generic
        // append the _<num> onto the function name
        // also add _depth if this is a version of the function that uses depth buffer
        const customName = `godrays${convertDepth !== undefined ? "_depth" : ""}${numSamples !== 100 ? "_s" + numSamples : ""}(`;
        sourceLists.sections[0] = customName;
        super(sourceLists, [
            "uCol",
            "uExposure",
            "uDecay",
            "uDensity",
            "uWeight",
            "uLightPos",
            "uThreshold",
            "uNewColor",
        ]);
        this.col = col;
        this.exposure = exposure;
        this.decay = decay;
        this.density = density;
        this.weight = weight;
        this.lightPos = lightPos;
        this.threshold = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.threshold;
        this.newColor = convertDepth === null || convertDepth === void 0 ? void 0 : convertDepth.newColor;
        // will be 1 if needs to convert depth, and 0 otherwise
        this.funcIndex = ~~(convertDepth !== undefined);
        let customGodRayFunc = glslfunctions_1.glslFuncs.godrays
            .split("godrays(")
            .join(customName)
            .replace(`NUM_SAMPLES = ${DEFAULT_SAMPLES}`, "NUM_SAMPLES = " + numSamples);
        if (convertDepth !== undefined) {
            // with regex, uncomment the line in the source code that does the
            // conversion (if you think about it that's basically what a preprocessor
            // does...)
            customGodRayFunc = customGodRayFunc.replace(/\/\/uncomment\s/g, "");
            this.externalFuncs.push(glslfunctions_1.glslFuncs.depth2occlusion);
        }
        this.externalFuncs.push(customGodRayFunc);
        this.brandExprWithChannel(this.funcIndex, samplerNum);
    }
    /** sets the light color */
    setColor(color) {
        this.setUniform("uCol" + this.id, color);
        this.col = color;
    }
    /** sets the exposure */
    setExposure(exposure) {
        this.setUniform("uExposure" + this.id, exposure);
        this.exposure = expr_1.wrapInValue(exposure);
    }
    /** sets the decay */
    setDecay(decay) {
        this.setUniform("uDecay" + this.id, decay);
        this.decay = expr_1.wrapInValue(decay);
    }
    /** sets the density */
    setDensity(density) {
        this.setUniform("uDensity" + this.id, density);
        this.density = expr_1.wrapInValue(density);
    }
    /** sets the weight */
    setWeight(weight) {
        this.setUniform("uWeight" + this.id, weight);
        this.weight = expr_1.wrapInValue(weight);
    }
    /** sets the light position */
    setLightPos(lightPos) {
        this.setUniform("uLightPos" + this.id, lightPos);
        this.lightPos = lightPos;
    }
    // these only matter when you're using a depth buffer and not an occlusion
    // buffer (although right now, you'll still be able to set them)
    setThreshold(threshold) {
        this.setUniform("uThreshold" + this.id, threshold);
        this.threshold = expr_1.wrapInValue(threshold);
    }
    setNewColor(newColor) {
        this.setUniform("uNewColor" + this.id, newColor);
        this.newColor = newColor;
    }
}
exports.GodRaysExpr = GodRaysExpr;
/**
 * create a godrays expression which requires an occlusion map; all values are
 * mutable by default
 * @param options object that defines godrays properties (has sane defaults)
 */
function godrays(options = {}) {
    return new GodRaysExpr(options.color, expr_1.wrapInValue(options.exposure), expr_1.wrapInValue(options.decay), expr_1.wrapInValue(options.density), expr_1.wrapInValue(options.weight), options.lightPos, options.samplerNum, options.numSamples, options.convertDepth === undefined
        ? undefined
        : {
            threshold: expr_1.wrapInValue(options.convertDepth.threshold),
            newColor: options.convertDepth.newColor,
        });
}
exports.godrays = godrays;

},{"../glslfunctions":63,"./expr":27,"./fragcolorexpr":28,"./vecexprs":61}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grain = exports.GrainExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
// TODO consider getting rid of this since it's easy to make your own with
// `random` and `brightness`
/** grain expression */
class GrainExpr extends expr_1.ExprVec4 {
    constructor(grain) {
        super(expr_1.tag `vec4((1.0 - ${grain} * random(gl_FragCoord.xy)) * gl_FragColor.rgb, gl_FragColor.a);`, ["uGrain"]);
        this.grain = grain;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
        this.needs.centerSample = true;
    }
    /** sets the grain level  */
    setGrain(grain) {
        this.setUniform("uGrain" + this.id, grain);
        this.grain = expr_1.wrapInValue(grain);
    }
}
exports.GrainExpr = GrainExpr;
/**
 * creates an expression that adds random grain
 * @param val how much the grain should impact the image (0 to 1 is reasonable)
 */
function grain(val) {
    return new GrainExpr(expr_1.wrapInValue(val));
}
exports.grain = grain;

},{"../glslfunctions":63,"./expr":27}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hsv2rgb = exports.HSVToRGBExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** HSV to RGB expression */
class HSVToRGBExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `hsv2rgb(${color})`, ["uHSVCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.hsv2rgb];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uHSVCol", color);
        this.color = color;
    }
}
exports.HSVToRGBExpr = HSVToRGBExpr;
/**
 * converts a color (with an alpha compoment) from hsv to rgb
 * @param col the hsva color to convert to rgba
 */
function hsv2rgb(col) {
    return new HSVToRGBExpr(col);
}
exports.hsv2rgb = hsv2rgb;

},{"../glslfunctions":63,"./expr":27}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invert = exports.InvertExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** invert expression */
class InvertExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `invert(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.invert];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.InvertExpr = InvertExpr;
/**
 * creates an expression that inverts the color, keeping the original alpha
 */
function invert(col) {
    return new InvertExpr(col);
}
exports.invert = invert;

},{"../glslfunctions":63,"./expr":27}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.len = exports.LenExpr = void 0;
const expr_1 = require("./expr");
/** length expression */
class LenExpr extends expr_1.ExprFloat {
    constructor(vec) {
        super(expr_1.tag `length(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.LenExpr = LenExpr;
/** creates an expreession that calculates the length of a vector */
function len(vec) {
    return new LenExpr(vec);
}
exports.len = len;

},{"./expr":27}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monochrome = exports.MonochromeExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** monochrome expression */
class MonochromeExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `monochrome(${color})`, ["uColor"]);
        this.externalFuncs = [glslfunctions_1.glslFuncs.monochrome];
        this.color = color;
    }
    /** sets the color */
    setColor(color) {
        this.setUniform("uColor", color);
        this.color = color;
    }
}
exports.MonochromeExpr = MonochromeExpr;
/**
 * creates an expression that converts a color into grayscale, keeping the
 * original alpha
 */
function monochrome(col) {
    return new MonochromeExpr(col);
}
exports.monochrome = monochrome;

},{"../glslfunctions":63,"./expr":27}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.motionblur = exports.MotionBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const channelsampleexpr_1 = require("./channelsampleexpr");
const expr_1 = require("./expr");
const fragcolorexpr_1 = require("./fragcolorexpr");
const opexpr_1 = require("./opexpr");
/** frame averaging motion blur loop */
class MotionBlurLoop extends mergepass_1.EffectLoop {
    constructor(target = 0, persistence = expr_1.float(expr_1.mut(0.3))) {
        const col1 = opexpr_1.op(channelsampleexpr_1.channel(target), "*", persistence);
        const col2 = opexpr_1.op(fragcolorexpr_1.fcolor(), "*", opexpr_1.op(1, "-", persistence));
        const effects = [
            mergepass_1.loop([opexpr_1.op(col1, "+", col2)]).target(target),
            channelsampleexpr_1.channel(target),
        ];
        super(effects, { num: 1 });
        this.persistence = persistence;
    }
    /** set the persistence (keep between 0 and 1) */
    setPersistence(float) {
        if (!(this.persistence instanceof expr_1.BasicFloat))
            throw new Error("persistence expression not basic float");
        this.persistence.setVal(float);
    }
}
exports.MotionBlurLoop = MotionBlurLoop;
/**
 * creates a frame averaging motion blur effect
 * @param target the channel where your accumulation buffer is (defaults to 0,
 * which you might be using for something like the depth texture, so be sure to
 * change this to suit your needs)
 * @param persistence close to 0 is more ghostly, and close to 1 is nearly no
 * motion blur at all (defaults to 0.3)
 */
function motionblur(target, persistence) {
    return new MotionBlurLoop(target, expr_1.wrapInValue(persistence));
}
exports.motionblur = motionblur;

},{"../mergepass":65,"./channelsampleexpr":21,"./expr":27,"./fragcolorexpr":28,"./opexpr":45}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mouse = exports.MouseExpr = void 0;
const expr_1 = require("./expr");
/** mouse position expression */
class MouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uMouse`, []);
        this.needs.mouseUniform = true;
    }
}
exports.MouseExpr = MouseExpr;
/**
 * creates an expression that evaluates to a vector representing the mouse
 * position in pixels
 */
function mouse() {
    return new MouseExpr();
}
exports.mouse = mouse;

},{"./expr":27}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.center = exports.NormCenterFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized centered frag coord expression */
class NormCenterFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(gl_FragCoord.xy / uResolution - 0.5)`, []);
    }
}
exports.NormCenterFragCoordExpr = NormCenterFragCoordExpr;
/**
 * creates an expression that calculates the normalized centered coord
 * (coordinates range from -0.5 to 0.5)
 */
function center() {
    return new NormCenterFragCoordExpr();
}
exports.center = center;

},{"./expr":27}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.norm = exports.NormExpr = void 0;
const expr_1 = require("./expr");
/** normalize expression */
class NormExpr extends expr_1.Operator {
    constructor(vec) {
        super(vec, expr_1.tag `normalize(${vec})`, ["uVec"]);
        this.vec = vec;
    }
    /** sets the vec to normalize */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
}
exports.NormExpr = NormExpr;
/** creates an expression that normalizes a vector */
function norm(vec) {
    return new NormExpr(vec);
}
exports.norm = norm;

},{"./expr":27}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pos = exports.NormFragCoordExpr = void 0;
const expr_1 = require("./expr");
/** normalized frag coord expression */
class NormFragCoordExpr extends expr_1.ExprVec2 {
    constructor() {
        // don't remove these parens! even if you think you are being clever about
        // order of operations
        super(expr_1.tag `(gl_FragCoord.xy / uResolution)`, []);
    }
}
exports.NormFragCoordExpr = NormFragCoordExpr;
/**
 * creates an expression that calculates the normalized frag coord (coordinates
 * range from 0 to 1)
 */
function pos() {
    return new NormFragCoordExpr();
}
exports.pos = pos;

},{"./expr":27}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nmouse = exports.NormMouseExpr = void 0;
const expr_1 = require("./expr");
/** normalized mouse position expression */
class NormMouseExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `(uMouse / uResolution.xy)`, []);
        this.needs.mouseUniform = true;
    }
}
exports.NormMouseExpr = NormMouseExpr;
/**
 * creates an expression that calculates the normalized mouse position
 * (coordinates range from 0 to 1)
 */
function nmouse() {
    return new NormMouseExpr();
}
exports.nmouse = nmouse;

},{"./expr":27}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.op = exports.OpExpr = void 0;
const expr_1 = require("./expr");
function genOpSourceList(left, op, right) {
    return {
        sections: ["(", ` ${op} `, ")"],
        values: [left, right],
    };
}
class OpExpr extends expr_1.Operator {
    constructor(left, op, right) {
        super(left, genOpSourceList(left, op, right), ["uLeft", "uRight"]);
        this.left = left;
        this.right = right;
    }
    setLeft(left) {
        this.setUniform("uLeft" + this.id, left);
        this.left = expr_1.wrapInValue(left);
    }
    setRight(right) {
        this.setUniform("uRight" + this.id, right);
        this.right = expr_1.wrapInValue(right);
    }
}
exports.OpExpr = OpExpr;
// implementation
/**
 * creates an arithmetic operator expression
 * @param left expression left of operator
 * @param op string representing arithmetic operator
 * @param right expression right of operator
 */
function op(left, op, right) {
    return new OpExpr(expr_1.wrapInValue(left), op, expr_1.wrapInValue(right));
}
exports.op = op;

},{"./expr":27}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fractalize = exports.perlin = exports.PerlinExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const opexpr_1 = require("./opexpr");
/** Perlin noise expression */
class PerlinExpr extends expr_1.ExprFloat {
    // TODO include a default
    constructor(pos) {
        super(expr_1.tag `gradientnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random2, glslfunctions_1.glslFuncs.gradientnoise];
    }
    /** sets the position to calculate noise value of */
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.PerlinExpr = PerlinExpr;
/**
 * creates a perlin noise expression; values range from -1 to 1 but they tend
 * to be grayer than the [[simplex]] implementation
 * @param pos position
 */
function perlin(pos) {
    return new PerlinExpr(pos);
}
exports.perlin = perlin;
/**
 * take any function from a position to a float, and repeatedly sum calls to it
 * with doubling frequency and halving amplitude (works well with [[simplex]]
 * and [[perlin]])
 * @param pos position
 * @param octaves how many layers deep to make the fractal
 * @param func the function to fractalize
 */
function fractalize(pos, octaves, func) {
    if (octaves < 0)
        throw new Error("octaves can't be < 0");
    const recurse = (pos, size, level) => {
        if (level <= 0)
            return expr_1.pfloat(0);
        return opexpr_1.op(func(opexpr_1.op(pos, "/", size * 2)), "+", recurse(pos, size / 2, level - 1));
    };
    return recurse(pos, 0.5, octaves);
}
exports.fractalize = fractalize;

},{"../glslfunctions":63,"./expr":27,"./opexpr":45}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pblur = exports.PowerBlurLoop = void 0;
const mergepass_1 = require("../mergepass");
const blurexpr_1 = require("./blurexpr");
const vecexprs_1 = require("./vecexprs");
const expr_1 = require("./expr");
const baseLog = (x, y) => Math.log(y) / Math.log(x);
// TODO consider getting rid of this, as it pretty much never looks good
/** power blur loop */
class PowerBlurLoop extends mergepass_1.EffectLoop {
    constructor(size) {
        const side = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(size, 0)));
        const up = blurexpr_1.gauss(expr_1.mut(vecexprs_1.pvec2(0, size)));
        const reps = Math.ceil(baseLog(2, size));
        super([side, up], {
            num: reps + 1,
        });
        this.size = size;
        this.loopInfo.func = (i) => {
            const distance = this.size / Math.pow(2, i);
            up.setDirection(vecexprs_1.pvec2(0, distance));
            side.setDirection(vecexprs_1.pvec2(distance, 0));
        };
    }
    /** sets the size of the radius */
    setSize(size) {
        this.size = size;
        this.loopInfo.num = Math.ceil(baseLog(2, size));
    }
}
exports.PowerBlurLoop = PowerBlurLoop;
/**
 * fast approximate blur for large blur radius that might look good in some cases
 * @param size the radius of the blur
 */
function pblur(size) {
    return new PowerBlurLoop(size);
}
exports.pblur = pblur;

},{"../mergepass":65,"./blurexpr":18,"./expr":27,"./vecexprs":61}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = exports.RandomExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** psuedorandom number expression */
class RandomExpr extends expr_1.ExprFloat {
    constructor(seed = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `random(${seed})`, ["uSeed"]);
        this.seed = seed;
        this.externalFuncs = [glslfunctions_1.glslFuncs.random];
    }
    /** sets the seed (vary this over time to get a moving effect) */
    setSeed(seed) {
        this.setUniform("uSeed", seed);
        this.seed = seed;
    }
}
exports.RandomExpr = RandomExpr;
/**
 * creates expression that evaluates to a pseudorandom number between 0 and 1
 * @param seed vec2 to to seed the random number (defaults to the normalized
 * frag coord)
 */
function random(seed) {
    return new RandomExpr(seed);
}
exports.random = random;

},{"../glslfunctions":63,"./expr":27,"./normfragcoordexpr":43}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.region = void 0;
const mergepass_1 = require("../mergepass");
const expr_1 = require("./expr");
const getcompexpr_1 = require("./getcompexpr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
const opexpr_1 = require("./opexpr");
const ternaryexpr_1 = require("./ternaryexpr");
const fragcolorexpr_1 = require("./fragcolorexpr");
// form: x1, y1, x2, y2
function createDifferenceFloats(floats) {
    const axes = "xy";
    const differences = [];
    if (floats.length !== 4) {
        throw new Error("incorrect amount of points specified for region");
    }
    for (let i = 0; i < 2; i++) {
        differences.push(opexpr_1.op(getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i]), "-", floats[i]));
    }
    for (let i = 2; i < floats.length; i++) {
        differences.push(opexpr_1.op(floats[i], "-", getcompexpr_1.getcomp(normfragcoordexpr_1.pos(), axes[i - 2])));
    }
    return differences;
}
/**
 * restrict an effect to a region of the screen
 * @param space top left, top right, bottom left, bottom right corners of the
 * region, or just a number if you wish to sample from a channel as the region
 * @param success expression for being inside the region
 * @param failure expression for being outside the region
 * @param not whether to invert the region
 */
function region(space, success, failure, not = false) {
    const floats = Array.isArray(space)
        ? space.map((f) => expr_1.wrapInValue(f))
        : typeof space === "number"
            ? expr_1.wrapInValue(space)
            : space;
    if (failure instanceof mergepass_1.EffectLoop) {
        if (!(success instanceof mergepass_1.EffectLoop)) {
            [success, failure] = [failure, success]; // swap the order
            not = !not; // invert the region
        }
    }
    if (success instanceof mergepass_1.EffectLoop) {
        if (!(failure instanceof mergepass_1.EffectLoop)) {
            return success.regionWrap(floats, failure, true, not);
        }
        // double loop, so we have to do separately
        return mergepass_1.loop([
            success.regionWrap(floats, fragcolorexpr_1.fcolor(), false, not),
            failure.regionWrap(floats, fragcolorexpr_1.fcolor(), true, !not),
        ]);
    }
    return ternaryexpr_1.ternary(Array.isArray(floats) ? createDifferenceFloats(floats) : floats, success.brandExprWithRegion(floats), failure.brandExprWithRegion(floats), not);
}
exports.region = region;

},{"../mergepass":65,"./expr":27,"./fragcolorexpr":28,"./getcompexpr":32,"./normfragcoordexpr":43,"./opexpr":45,"./ternaryexpr":57}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolution = exports.ResolutionExpr = void 0;
const expr_1 = require("./expr");
/** resolution expression */
class ResolutionExpr extends expr_1.ExprVec2 {
    constructor() {
        super(expr_1.tag `uResolution`, []);
    }
}
exports.ResolutionExpr = ResolutionExpr;
/** creates an expression that evaluates to a vector representing the resolution */
function resolution() {
    return new ResolutionExpr();
}
exports.resolution = resolution;

},{"./expr":27}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rgb2hsv = exports.RGBToHSVExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** RGB to HSV expression */
class RGBToHSVExpr extends expr_1.ExprVec4 {
    constructor(color) {
        super(expr_1.tag `rgb2hsv(${color})`, ["uRGBCol"]);
        this.color = color;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rgb2hsv];
    }
    /** sets the color to convert */
    setColor(color) {
        this.setUniform("uRGBCol", color);
        this.color = color;
    }
}
exports.RGBToHSVExpr = RGBToHSVExpr;
/**
 * creates an expression that converts a color (with an alpha component) from
 * rgb to hsv
 * @param col the rgba color to convert to hsva
 */
function rgb2hsv(col) {
    return new RGBToHSVExpr(col);
}
exports.rgb2hsv = rgb2hsv;

},{"../glslfunctions":63,"./expr":27}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotate = exports.RotateExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** rotate expression */
class RotateExpr extends expr_1.ExprVec2 {
    constructor(vec, angle) {
        super(expr_1.tag `rotate2d(${vec}, ${angle})`, ["uVec", "uAngle"]);
        this.vec = vec;
        this.angle = angle;
        this.externalFuncs = [glslfunctions_1.glslFuncs.rotate2d];
    }
    /** set the vector to rotate */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** set the angle to rotate by */
    setAngle(angle) {
        this.setUniform("uAngle" + this.id, angle);
        this.angle = expr_1.wrapInValue(angle);
    }
}
exports.RotateExpr = RotateExpr;
/**
 * creates an expression that rotates a vector by a given angle
 * @param vec the vector to rotate
 * @param angle radians to rotate vector by
 */
function rotate(vec, angle) {
    return new RotateExpr(vec, expr_1.wrapInValue(angle));
}
exports.rotate = rotate;

},{"../glslfunctions":63,"./expr":27}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = exports.SceneSampleExpr = void 0;
const expr_1 = require("./expr");
const normfragcoordexpr_1 = require("./normfragcoordexpr");
/** scene sample expression */
class SceneSampleExpr extends expr_1.ExprVec4 {
    constructor(coord = normfragcoordexpr_1.pos()) {
        super(expr_1.tag `texture2D(uSceneSampler, ${coord})`, ["uCoord"]);
        this.coord = coord;
        this.needs.sceneBuffer = true;
    }
    /** sets coordinate where scene is being sampled from */
    setCoord(coord) {
        this.setUniform("uCoord", coord);
        this.coord = coord;
    }
}
exports.SceneSampleExpr = SceneSampleExpr;
/**
 * creates an expression that samples the original scene
 * @param vec where to sample the original scene texture (defaults to the
 * normalized frag coord, but change this if you want to transform the
 * coordinate space of the original image)
 */
function input(vec) {
    return new SceneSampleExpr(vec);
}
exports.input = input;

},{"./expr":27,"./normfragcoordexpr":43}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetColorExpr = void 0;
const expr_1 = require("./expr");
/**
 * set fragment color expression (not needed for the user; used internally for
 * wrapping any kind of [[Vec4]] in an [[ExprVec4]])
 */
class SetColorExpr extends expr_1.ExprVec4 {
    constructor(vec) {
        super(expr_1.tag `(${vec})`, ["uVal"]);
        this.vec = vec;
    }
}
exports.SetColorExpr = SetColorExpr;

},{"./expr":27}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplex = exports.SimplexNoise = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** simplex noise expression */
class SimplexNoise extends expr_1.ExprFloat {
    constructor(pos) {
        super(expr_1.tag `simplexnoise(${pos})`, ["uPos"]);
        this.pos = pos;
        this.externalFuncs = [glslfunctions_1.glslFuncs.simplexhelpers, glslfunctions_1.glslFuncs.simplexnoise];
    }
    setPos(pos) {
        this.setUniform("uPos", pos);
        this.pos = pos;
    }
}
exports.SimplexNoise = SimplexNoise;
/**
 * creates a simplex noise expression; values range from -1 to 1
 * @param pos position
 */
function simplex(pos) {
    return new SimplexNoise(pos);
}
exports.simplex = simplex;

},{"../glslfunctions":63,"./expr":27}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sobel = exports.SobelExpr = void 0;
const glslfunctions_1 = require("../glslfunctions");
const expr_1 = require("./expr");
/** Sobel edge detection expression */
class SobelExpr extends expr_1.ExprVec4 {
    constructor(samplerNum) {
        super(expr_1.tag `sobel()`, []);
        this.externalFuncs = [glslfunctions_1.glslFuncs.sobel];
        this.brandExprWithChannel(0, samplerNum);
    }
}
exports.SobelExpr = SobelExpr;
/**
 * creates a Sobel edge detection expression that outputs the raw result; for
 * more highly processed edge detection expressions, see [[edgecolor]] or
 * [[edge]]
 * @param samplerNum where to sample from
 */
function sobel(samplerNum) {
    return new SobelExpr(samplerNum);
}
exports.sobel = sobel;

},{"../glslfunctions":63,"./expr":27}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ternary = exports.TernaryExpr = void 0;
const expr_1 = require("./expr");
function genTernarySourceList(floats, success, failure, not) {
    const sourceList = {
        sections: [`(${not ? "!" : ""}(`],
        values: [],
    };
    let counter = 0;
    // generate the boolean expression
    if (floats !== null) {
        for (const f of floats) {
            counter++;
            const last = counter === floats.length;
            sourceList.values.push(f);
            sourceList.sections.push(` > 0.${last ? ") ? " : " && "}`);
        }
    }
    else {
        sourceList.sections[0] += "uCount == 0) ? ";
    }
    // generate the success expression and colon
    sourceList.values.push(success);
    sourceList.sections.push(" : ");
    // generate the failure expression
    sourceList.values.push(failure);
    sourceList.sections.push(")");
    return sourceList;
}
class TernaryExpr extends expr_1.Operator {
    constructor(floats, success, failure, not) {
        super(success, genTernarySourceList(floats, success, failure, not), [
            ...(floats !== null
                ? Array.from(floats, (val, index) => "uFloat" + index)
                : []),
            "uSuccess",
            "uFailure",
        ]);
        this.success = success;
        this.failure = failure;
        this.needs.passCount = floats === null;
    }
}
exports.TernaryExpr = TernaryExpr;
/**
 * creates a ternary expression; the boolean expression is if all the floats
 * given are greater than 0
 * @param floats if all these floats (or the single float) are above 0, then
 * evaluates to success expression
 * @param success
 * @param failure
 * @param not whether to invert the ternary
 */
function ternary(floats, success, failure, not = false) {
    // TODO make this type safe (ran into a type error here)
    // wrap single float in array if need be
    if (!Array.isArray(floats) && floats !== null)
        floats = [floats].map((f) => expr_1.wrapInValue(f));
    // TODO get rid of this cast
    return new TernaryExpr(floats, expr_1.wrapInValue(success), expr_1.wrapInValue(failure), not);
}
exports.ternary = ternary;

},{"./expr":27}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.time = exports.TimeExpr = void 0;
const expr_1 = require("./expr");
/** time expression */
class TimeExpr extends expr_1.ExprFloat {
    constructor() {
        super(expr_1.tag `uTime`, []);
        this.needs.timeUniform = true;
    }
}
exports.TimeExpr = TimeExpr;
/** creates a time expression that evaluates to the current time */
function time() {
    return new TimeExpr();
}
exports.time = time;

},{"./expr":27}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translate = exports.TranslateExpr = void 0;
const expr_1 = require("./expr");
// really just adding two vecs together, but it might be confusing that there's
// rotate but no translate, so this is included. also it could make some
// operations more readable
/** sets the translate expression */
class TranslateExpr extends expr_1.ExprVec2 {
    constructor(vec, pos) {
        super(expr_1.tag `(${vec} + ${pos})`, ["uVec", "uPos"]);
        this.vec = vec;
        this.pos = pos;
    }
    /** sets the starting position */
    setVec(vec) {
        this.setUniform("uVec" + this.id, vec);
        this.vec = vec;
    }
    /** sets how far the vector will be translated */
    setPos(pos) {
        this.setUniform("uPos" + this.id, pos);
        this.pos = pos;
    }
}
exports.TranslateExpr = TranslateExpr;
/** translates the position of a vector by another vector */
function translate(vec, pos) {
    return new TranslateExpr(vec, pos);
}
exports.translate = translate;

},{"./expr":27}],60:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truedepth = exports.TrueDepthExpr = void 0;
const expr_1 = require("./expr");
const glslfunctions_1 = require("../glslfunctions");
/** true depth expression */
class TrueDepthExpr extends expr_1.ExprFloat {
    constructor(depth) {
        super(expr_1.tag `truedepth(${depth})`, ["uDist"]);
        this.depth = depth;
        this.externalFuncs = [glslfunctions_1.glslFuncs.truedepth];
    }
    /** sets the distance to convert to the true depth */
    setDist(depth) {
        this.setUniform("uDist", depth);
        this.depth = expr_1.wrapInValue(depth);
    }
}
exports.TrueDepthExpr = TrueDepthExpr;
/** calculates the linear depth from inverse depth value `1 / distance` */
function truedepth(depth) {
    return new TrueDepthExpr(expr_1.wrapInValue(depth));
}
exports.truedepth = truedepth;

},{"../glslfunctions":63,"./expr":27}],61:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pvec4 = exports.pvec3 = exports.pvec2 = exports.vec4 = exports.vec3 = exports.vec2 = void 0;
const expr_1 = require("./expr");
/** @ignore */
function vecSourceList(...components) {
    const sections = ["vec" + components.length + "("];
    for (let i = 0; i < components.length - 1; i++) {
        sections.push(", ");
    }
    const defaultNames = [];
    for (let i = 0; i < components.length; i++) {
        defaultNames.push("uComp" + i);
    }
    sections.push(")");
    return [{ sections: sections, values: components }, defaultNames];
}
// expression vector shorthands
/** creates a basic vec2 expression */
function vec2(comp1, comp2) {
    return new expr_1.BasicVec2(...vecSourceList(...[comp1, comp2].map((c) => expr_1.wrapInValue(c))));
}
exports.vec2 = vec2;
/** creates a basic vec3 expression */
function vec3(comp1, comp2, comp3) {
    return new expr_1.BasicVec3(...vecSourceList(...[comp1, comp2, comp3].map((c) => expr_1.wrapInValue(c))));
}
exports.vec3 = vec3;
/** creates a basic vec4 expression */
function vec4(comp1, comp2, comp3, comp4) {
    return new expr_1.BasicVec4(...vecSourceList(...[comp1, comp2, comp3, comp4].map((c) => expr_1.wrapInValue(c))));
}
exports.vec4 = vec4;
// primitive vector shorthands
/** creates a primitive vec2 expression */
function pvec2(comp1, comp2) {
    return new expr_1.PrimitiveVec2([comp1, comp2]);
}
exports.pvec2 = pvec2;
/** creates a primitive vec3 expression */
function pvec3(comp1, comp2, comp3) {
    return new expr_1.PrimitiveVec3([comp1, comp2, comp3]);
}
exports.pvec3 = pvec3;
/** creates a primitive vec4 expression */
function pvec4(comp1, comp2, comp3, comp4) {
    return new expr_1.PrimitiveVec4([comp1, comp2, comp3, comp4]);
}
exports.pvec4 = pvec4;

},{"./expr":27}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],63:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.glslFuncs = void 0;
// adapted from The Book of Shaders
/** glsl source code for external functions */
exports.glslFuncs = {
    // TODO bad to calculate single pixel width every time; maybe it can be a need
    texture2D_region: `vec4 texture2D_region(
  float r_x_min,
  float r_y_min,
  float r_x_max,
  float r_y_max,
  sampler2D sampler,
  vec2 uv
) {
  vec2 d = vec2(1., 1.) / uResolution; // pixel width
  return texture2D(sampler, clamp(uv, vec2(r_x_min + d.x, r_y_min + d.x), vec2(r_x_max - d.y, r_y_max - d.y)));
}`,
    // TODO replace with a better one
    // adapted from The Book of Shaders
    random: `float random(vec2 st) {
  return fract(sin(dot(st.xy / 99., vec2(12.9898, 78.233))) * 43758.5453123);
}`,
    // adapted from The Book of Shaders
    random2: `vec2 random2(vec2 st) {
  st = vec2(dot(st,vec2(127.1,311.7)), dot(st,vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(st)*43758.5453123);
}`,
    rotate2d: `vec2 rotate2d(vec2 v, float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * v;
}`,
    // adapted from The Book of Shaders
    hsv2rgb: `vec4 hsv2rgb(vec4 co){
  vec3 c = co.xyz;
  vec3 rgb = clamp(abs(mod(
    c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  vec3 hsv = c.z * mix(vec3(1.0), rgb, c.y);
  return vec4(hsv.x, hsv.y, hsv.z, co.a);
}`,
    // adapted from The Book of Shaders
    rgb2hsv: `vec4 rgb2hsv(vec4 co){
  vec3 c = co.rgb;
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec4(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
              d / (q.x + e),
              q.x, co.a);
}`,
    // all gaussian blurs adapted from:
    // https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
    gauss5: `vec4 gauss5(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3333333333333333) * dir;
  col += texture2D(uSampler, uv) * 0.29411764705882354;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.35294117647058826;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.35294117647058826;
  return col;
}`,
    gauss9: `vec4 gauss9(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * dir;
  vec2 off2 = vec2(3.2307692308) * dir;
  col += texture2D(uSampler, uv) * 0.2270270270;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.3162162162;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.0702702703;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.0702702703;
  return col;
}`,
    gauss13: `vec4 gauss13(vec2 dir) {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 col = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * dir;
  vec2 off2 = vec2(3.2941176470588234) * dir;
  vec2 off3 = vec2(5.176470588235294) * dir;
  col += texture2D(uSampler, uv) * 0.1964825501511404;
  col += texture2D(uSampler, uv + (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv - (off1 / uResolution)) * 0.2969069646728344;
  col += texture2D(uSampler, uv + (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv - (off2 / uResolution)) * 0.09447039785044732;
  col += texture2D(uSampler, uv + (off3 / uResolution)) * 0.010381362401148057;
  col += texture2D(uSampler, uv - (off3 / uResolution)) * 0.010381362401148057;
  return col;
}`,
    contrast: `vec4 contrast(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb = ((col.rgb - 0.5) * val) + 0.5;
  col.rgb *= col.a;
  return col;
}`,
    brightness: `vec4 brightness(float val, vec4 col) {
  col.rgb /= col.a;
  col.rgb += val;
  col.rgb *= col.a;
  return col;
}`,
    // adapted from https://www.shadertoy.com/view/ls3GWS which was adapted from
    // http://www.geeks3d.com/20110405/fxaa-fast-approximate-anti-aliasing-demo-glsl-opengl-test-radeon-geforce/3/
    // original algorithm created by Timothy Lottes
    fxaa: `vec4 fxaa() {
  float FXAA_SPAN_MAX = 8.0;
  float FXAA_REDUCE_MUL = 1.0 / FXAA_SPAN_MAX;
  float FXAA_REDUCE_MIN = 1.0 / 128.0;
  float FXAA_SUBPIX_SHIFT = 1.0 / 4.0;

  vec2 rcpFrame = 1. / uResolution.xy;
  vec2 t_uv = gl_FragCoord.xy / uResolution.xy; 
  vec4 uv = vec4(t_uv, t_uv - (rcpFrame * (0.5 + FXAA_SUBPIX_SHIFT)));

  vec3 rgbNW = texture2D(uSampler, uv.zw).xyz;
  vec3 rgbNE = texture2D(uSampler, uv.zw + vec2(1,0) * rcpFrame.xy).xyz;
  vec3 rgbSW = texture2D(uSampler, uv.zw + vec2(0,1) * rcpFrame.xy).xyz;
  vec3 rgbSE = texture2D(uSampler, uv.zw + vec2(1,1) * rcpFrame.xy).xyz;
  vec4 rgbMfull = texture2D(uSampler, uv.xy);
  vec3 rgbM = rgbMfull.xyz;
  float alpha = rgbMfull.a;

  vec3 luma = vec3(0.299, 0.587, 0.114);
  float lumaNW = dot(rgbNW, luma);
  float lumaNE = dot(rgbNE, luma);
  float lumaSW = dot(rgbSW, luma);
  float lumaSE = dot(rgbSE, luma);
  float lumaM = dot(rgbM,  luma);

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  vec2 dir;
  dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
  dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

  float dirReduce = max(
    (lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0/(min(abs(dir.x), abs(dir.y)) + dirReduce);

  dir = min(vec2(FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
    max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
    dir * rcpDirMin)) * rcpFrame.xy;

  vec3 rgbA = (1.0 / 2.0) * (
    texture2D(uSampler, uv.xy + dir * (1.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (2.0 / 3.0 - 0.5)).xyz);
  vec3 rgbB = rgbA * (1.0 / 2.0) + (1.0 / 4.0) * (
    texture2D(uSampler, uv.xy + dir * (0.0 / 3.0 - 0.5)).xyz +
    texture2D(uSampler, uv.xy + dir * (3.0 / 3.0 - 0.5)).xyz);

  float lumaB = dot(rgbB, luma);

  if (lumaB < lumaMin || lumaB > lumaMax) {
    return vec4(rgbA.r, rgbA.g, rgbA.b, alpha);
  }

  return vec4(rgbB.r, rgbB.g, rgbB.b, alpha);
}`,
    // normal curve is a = 0 and b = 1
    gaussian: `float gaussian(float x, float a, float b) {
  float e = 2.71828;
  return pow(e, -pow(x - a, 2.) / b);
}`,
    // for calculating the true distance from 0 to 1 depth buffer
    // the small delta is to prevent division by zero, which is undefined behavior
    truedepth: `float truedepth(float i) {
  i = max(i, 0.00000001);
  return (1. - i) / i;
}`,
    // based off of https://fabiensanglard.net/lightScattering/index.php
    godrays: `vec4 godrays(
  vec4 col,
  float exposure,
  float decay,
  float density,
  float weight,
  vec2 lightPos,
  float threshold,
  vec4 newColor
) {
  vec2 texCoord = gl_FragCoord.xy / uResolution;
  vec2 deltaTexCoord = texCoord - lightPos;

  const int NUM_SAMPLES = 100;
  deltaTexCoord *= 1. / float(NUM_SAMPLES) * density;
  float illuminationDecay = 1.0;

  for (int i=0; i < NUM_SAMPLES; i++) {
    texCoord -= deltaTexCoord;
    vec4 sample = texture2D(uSampler, texCoord);
    //uncomment sample = depth2occlusion(sample, newColor, threshold);
    sample *= illuminationDecay * weight;
    col += sample;
    illuminationDecay *= decay;
  }
  return col * exposure;
}`,
    depth2occlusion: `vec4 depth2occlusion(vec4 depthCol, vec4 newCol, float threshold) {
  float red = 1. - ceil(depthCol.r - threshold);
  return vec4(newCol.rgb * red, 1.0);
}`,
    // adapted from The Book of Shaders, which was adapted from Inigo Quilez
    // from this example: https://www.shadertoy.com/view/XdXGW8
    gradientnoise: `float gradientnoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(mix(dot(random2(i + vec2(0.0,0.0)), f - vec2(0.0, 0.0)),
                     dot(random2(i + vec2(1.0,0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(random2(i + vec2(0.0,1.0)), f - vec2(0.0, 1.0)),
                 dot(random2(i + vec2(1.0,1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}`,
    // adapted from The Book of Shaders
    // https://thebookofshaders.com/edit.php#11/2d-snoise-clear.frag
    // this was adapted from this fast implementation
    // https://github.com/ashima/webgl-noise
    // simplex noise invented by Ken Perlin
    simplexnoise: `float simplexnoise(vec2 v) {
  // Precompute values for skewed triangular grid
  const vec4 C = vec4(0.211324865405187,
                      // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,
                      // 0.5*(sqrt(3.0)-1.0)
                      -0.577350269189626,
                      // -1.0 + 2.0 * C.x
                      0.024390243902439);
                      // 1.0 / 41.0

  // First corner (x0)
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);

  // Other two corners (x1, x2)
  vec2 i1 = vec2(0.0);
  i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
  vec2 x1 = x0.xy + C.xx - i1;
  vec2 x2 = x0.xy + C.zz;

  // Do some permutations to avoid
  // truncation effects in permutation
  i = mod289_2(i);
  vec3 p = permute(
          permute( i.y + vec3(0.0, i1.y, 1.0))
              + i.x + vec3(0.0, i1.x, 1.0 ));

  vec3 m = max(0.5 - vec3(
                      dot(x0,x0),
                      dot(x1,x1),
                      dot(x2,x2)
                      ), 0.0);

  m = m*m ;
  m = m*m ;

  // Gradients:
  //  41 pts uniformly over a line, mapped onto a diamond
  //  The ring size 17*17 = 289 is close to a multiple
  //      of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt(a0*a0 + h*h);
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

  // Compute final noise value at P
  vec3 g = vec3(0.0);
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
  return 130.0 * dot(m, g);
}`,
    // only useful for simplex noise
    simplexhelpers: `vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289_2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289_3(((x*34.0)+1.0)*x); }`,
    // sobel adapted from https://gist.github.com/Hebali/6ebfc66106459aacee6a9fac029d0115
    sobel: `vec4 sobel() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 k[8];

  float w = 1. / uResolution.x;
  float h = 1. / uResolution.y;

  k[0] = texture2D(uSampler, uv + vec2(-w, -h));
  k[1] = texture2D(uSampler, uv + vec2(0., -h));
  k[2] = texture2D(uSampler, uv + vec2(w, -h));
  k[3] = texture2D(uSampler, uv + vec2(-w, 0.));

  k[4] = texture2D(uSampler, uv + vec2(w, 0.));
  k[5] = texture2D(uSampler, uv + vec2(-w, h));
  k[6] = texture2D(uSampler, uv + vec2(0., h));
  k[7] = texture2D(uSampler, uv + vec2(w, h));

  vec4 edge_h = k[2] + (2. * k[4]) + k[7] - (k[0] + (2. * k[3]) + k[5]);
  vec4 edge_v = k[0] + (2. * k[1]) + k[2] - (k[5] + (2. * k[6]) + k[7]);
  vec4 sob = sqrt(edge_h * edge_h + edge_v * edge_v);

  return vec4(1. - sob.rgb, 1.);
}`,
    // inlining a similar function will substitute in the full expression for
    // every component, so it's more efficient to have a function
    monochrome: `vec4 monochrome(vec4 col) {
  return vec4(vec3((col.r + col.g + col.b) / 3.), col.a);
}`,
    invert: `vec4 invert(vec4 col) {
  return vec4(vec3(1., 1., 1.) - col.rgb, col.a);
}`,
    channel: `vec4 channel(vec2 uv, sampler2D sampler) {
  return texture2D(sampler, uv);
}`,
};

},{}],64:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./mergepass"), exports);
__exportStar(require("./exprtypes"), exports);
__exportStar(require("./glslfunctions"), exports);
__exportStar(require("./settings"), exports);
__exportStar(require("./exprs/blurexpr"), exports);
__exportStar(require("./exprs/fragcolorexpr"), exports);
__exportStar(require("./exprs/vecexprs"), exports);
__exportStar(require("./exprs/opexpr"), exports);
__exportStar(require("./exprs/powerblur"), exports);
__exportStar(require("./exprs/blur2dloop"), exports);
__exportStar(require("./exprs/lenexpr"), exports);
__exportStar(require("./exprs/normexpr"), exports);
__exportStar(require("./exprs/fragcoordexpr"), exports);
__exportStar(require("./exprs/normfragcoordexpr"), exports);
__exportStar(require("./exprs/normcenterfragcoordexpr"), exports);
__exportStar(require("./exprs/scenesampleexpr"), exports);
__exportStar(require("./exprs/brightnessexpr"), exports);
__exportStar(require("./exprs/contrastexpr"), exports);
__exportStar(require("./exprs/grainexpr"), exports);
__exportStar(require("./exprs/getcompexpr"), exports);
__exportStar(require("./exprs/changecompexpr"), exports);
__exportStar(require("./exprs/rgbtohsvexpr"), exports);
__exportStar(require("./exprs/hsvtorgbexpr"), exports);
__exportStar(require("./exprs/timeexpr"), exports);
__exportStar(require("./exprs/arity1"), exports);
__exportStar(require("./exprs/arity2"), exports);
__exportStar(require("./exprs/fxaaexpr"), exports);
__exportStar(require("./exprs/channelsampleexpr"), exports);
__exportStar(require("./exprs/dofloop"), exports);
__exportStar(require("./exprs/truedepthexpr"), exports);
__exportStar(require("./exprs/godraysexpr"), exports);
__exportStar(require("./exprs/depthtoocclusionexpr"), exports);
__exportStar(require("./exprs/resolutionexpr"), exports);
__exportStar(require("./exprs/mouseexpr"), exports);
__exportStar(require("./exprs/rotateexpr"), exports);
__exportStar(require("./exprs/translateexpr"), exports);
__exportStar(require("./exprs/normmouseexpr"), exports);
__exportStar(require("./exprs/perlinexpr"), exports);
__exportStar(require("./exprs/simplexexpr"), exports);
__exportStar(require("./exprs/motionblurloop"), exports);
__exportStar(require("./exprs/randomexpr"), exports);
__exportStar(require("./exprs/sobelexpr"), exports);
__exportStar(require("./exprs/bloomloop"), exports);
__exportStar(require("./exprs/monochromeexpr"), exports);
__exportStar(require("./exprs/invertexpr"), exports);
__exportStar(require("./exprs/edgeexpr"), exports);
__exportStar(require("./exprs/edgecolorexpr"), exports);
__exportStar(require("./exprs/ternaryexpr"), exports);
__exportStar(require("./exprs/regiondecorator"), exports);
__exportStar(require("./exprs/expr"), exports);

},{"./exprs/arity1":14,"./exprs/arity2":15,"./exprs/bloomloop":16,"./exprs/blur2dloop":17,"./exprs/blurexpr":18,"./exprs/brightnessexpr":19,"./exprs/changecompexpr":20,"./exprs/channelsampleexpr":21,"./exprs/contrastexpr":22,"./exprs/depthtoocclusionexpr":23,"./exprs/dofloop":24,"./exprs/edgecolorexpr":25,"./exprs/edgeexpr":26,"./exprs/expr":27,"./exprs/fragcolorexpr":28,"./exprs/fragcoordexpr":29,"./exprs/fxaaexpr":30,"./exprs/getcompexpr":32,"./exprs/godraysexpr":33,"./exprs/grainexpr":34,"./exprs/hsvtorgbexpr":35,"./exprs/invertexpr":36,"./exprs/lenexpr":37,"./exprs/monochromeexpr":38,"./exprs/motionblurloop":39,"./exprs/mouseexpr":40,"./exprs/normcenterfragcoordexpr":41,"./exprs/normexpr":42,"./exprs/normfragcoordexpr":43,"./exprs/normmouseexpr":44,"./exprs/opexpr":45,"./exprs/perlinexpr":46,"./exprs/powerblur":47,"./exprs/randomexpr":48,"./exprs/regiondecorator":49,"./exprs/resolutionexpr":50,"./exprs/rgbtohsvexpr":51,"./exprs/rotateexpr":52,"./exprs/scenesampleexpr":53,"./exprs/simplexexpr":55,"./exprs/sobelexpr":56,"./exprs/ternaryexpr":57,"./exprs/timeexpr":58,"./exprs/translateexpr":59,"./exprs/truedepthexpr":60,"./exprs/vecexprs":61,"./exprtypes":62,"./glslfunctions":63,"./mergepass":65,"./settings":66}],65:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTexture = exports.makeTexture = exports.Merger = exports.loop = exports.EffectLoop = exports.EffectDictionary = void 0;
const codebuilder_1 = require("./codebuilder");
const expr_1 = require("./exprs/expr");
const fragcolorexpr_1 = require("./exprs/fragcolorexpr");
const regiondecorator_1 = require("./exprs/regiondecorator");
const scenesampleexpr_1 = require("./exprs/scenesampleexpr");
const setcolorexpr_1 = require("./exprs/setcolorexpr");
const ternaryexpr_1 = require("./exprs/ternaryexpr");
const settings_1 = require("./settings");
const webglprogramloop_1 = require("./webglprogramloop");
function wrapInSetColors(effects) {
    return effects.map((e) => e instanceof expr_1.ExprVec4 || e instanceof EffectLoop ? e : new setcolorexpr_1.SetColorExpr(e));
}
// should be function of loop?
function processEffectMap(eMap) {
    const result = {};
    for (const name in eMap) {
        const val = eMap[name];
        result[name] = wrapInSetColors(val);
    }
    return result;
}
class EffectDictionary {
    constructor(effectMap) {
        this.effectMap = processEffectMap(effectMap);
    }
    toProgramMap(gl, vShader, uniformLocs, fShaders) {
        const programMap = {};
        let needs = {
            neighborSample: false,
            centerSample: false,
            sceneBuffer: false,
            timeUniform: false,
            mouseUniform: false,
            passCount: false,
            extraBuffers: new Set(),
        };
        for (const name in this.effectMap) {
            const effects = this.effectMap[name];
            // wrap the given list of effects as a loop if need be
            const effectLoop = new EffectLoop(effects, { num: 1 });
            if (effectLoop.effects.length === 0) {
                throw new Error("list of effects was empty");
            }
            const programLoop = effectLoop.genPrograms(gl, vShader, uniformLocs, fShaders);
            // walk the tree to the final program
            let atBottom = false;
            let currProgramLoop = programLoop;
            while (!atBottom) {
                if (currProgramLoop.programElement instanceof webglprogramloop_1.WebGLProgramLeaf) {
                    // we traveled right and hit a program, so it must be the last
                    currProgramLoop.last = true;
                    atBottom = true;
                }
                else {
                    // set the current program loop to the last in the list
                    currProgramLoop =
                        currProgramLoop.programElement[currProgramLoop.programElement.length - 1];
                }
            }
            needs = webglprogramloop_1.updateNeeds(needs, programLoop.getTotalNeeds());
            programMap[name] = programLoop;
        }
        return { programMap, needs };
    }
}
exports.EffectDictionary = EffectDictionary;
/** effect loop, which can loop over other effects or effect loops */
class EffectLoop {
    constructor(effects, loopInfo) {
        this.effects = wrapInSetColors(effects);
        this.loopInfo = loopInfo;
    }
    /** @ignore */
    getSampleNum(mult = 1, sliceStart = 0, sliceEnd = this.effects.length) {
        mult *= this.loopInfo.num;
        let acc = 0;
        const sliced = this.effects.slice(sliceStart, sliceEnd);
        for (const e of sliced) {
            acc += e.getSampleNum(mult);
        }
        return acc;
    }
    /**
     * @ignore
     * places effects into loops broken up by sampling effects
     */
    regroup() {
        let sampleCount = 0;
        /** number of samples in all previous */
        let prevSampleCount = 0;
        let prevEffects = [];
        const regroupedEffects = [];
        let prevTarget;
        let currTarget;
        let mustBreakCounter = 0;
        const breakOff = () => {
            mustBreakCounter--;
            if (prevEffects.length > 0) {
                // break off all previous effects into their own loop
                if (prevEffects.length === 1) {
                    // this is to prevent wrapping in another effect loop
                    regroupedEffects.push(prevEffects[0]);
                }
                else {
                    regroupedEffects.push(new EffectLoop(prevEffects, { num: 1 }));
                }
                sampleCount -= prevSampleCount;
                prevEffects = [];
            }
        };
        for (const e of this.effects) {
            const sampleNum = e.getSampleNum();
            prevSampleCount = sampleCount;
            sampleCount += sampleNum;
            if (e instanceof EffectLoop) {
                currTarget = e.loopInfo.target;
                if (e.hasTargetSwitch()) {
                    mustBreakCounter = 2;
                }
            }
            else {
                // if it's not a loop it's assumed the target is that of outer loop
                currTarget = this.loopInfo.target;
            }
            if (sampleCount > 0 ||
                currTarget !== prevTarget ||
                mustBreakCounter > 0) {
                breakOff();
            }
            prevEffects.push(e);
            prevTarget = currTarget;
        }
        // push on all the straggling effects after the grouping is done
        breakOff();
        return regroupedEffects;
    }
    genPrograms(gl, vShader, uniformLocs, shaders) {
        // validate
        const fullSampleNum = this.getSampleNum() / this.loopInfo.num;
        const firstSampleNum = this.getSampleNum(undefined, 0, 1) / this.loopInfo.num;
        const restSampleNum = this.getSampleNum(undefined, 1) / this.loopInfo.num;
        if (!this.hasTargetSwitch() &&
            (fullSampleNum === 0 || (firstSampleNum === 1 && restSampleNum === 0))) {
            const codeBuilder = new codebuilder_1.CodeBuilder(this);
            const program = codeBuilder.compileProgram(gl, vShader, uniformLocs, shaders);
            return program;
        }
        // otherwise, regroup and try again on regrouped loops
        this.effects = this.regroup();
        return new webglprogramloop_1.WebGLProgramLoop(this.effects.map((e) => e.genPrograms(gl, vShader, uniformLocs, shaders)), this.loopInfo, gl);
    }
    /**
     * changes the render target of an effect loop (-1 targest the scene texture;
     * this is used internally)
     */
    target(num) {
        this.loopInfo.target = num;
        return this;
    }
    /** @ignore */
    hasTargetSwitch() {
        for (const e of this.effects) {
            if (e instanceof EffectLoop) {
                if (e.loopInfo.target !== this.loopInfo.target || e.hasTargetSwitch())
                    return true;
            }
        }
        return false;
    }
    /** @ignore */
    regionWrap(space, failure, finalPath = true, not) {
        this.effects = this.effects.map((e, index) => 
        // loops that aren't all the way to the right can't terminate the count ternery
        // don't wrap fcolors in a ternery (it's redundant)
        e instanceof EffectLoop
            ? e.regionWrap(space, failure, index === this.effects.length - 1, not)
            : new setcolorexpr_1.SetColorExpr(regiondecorator_1.region(space, e.brandExprWithRegion(space), index === this.effects.length - 1 && finalPath
                ? !(failure instanceof fragcolorexpr_1.FragColorExpr)
                    ? ternaryexpr_1.ternary(null, failure, fragcolorexpr_1.fcolor())
                    : failure
                : fragcolorexpr_1.fcolor(), not)));
        return this;
    }
}
exports.EffectLoop = EffectLoop;
/** creates an effect loop */
function loop(effects, rep = 1) {
    return new EffectLoop(effects, { num: rep });
}
exports.loop = loop;
/** @ignore */
const V_SOURCE = `attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}\n`;
/** class that can merge effects */
class Merger {
    /**
     * constructs the object that runs the effects
     * @param effects list of effects that define the final effect
     * @param source the source image or texture
     * @param gl the target rendering context
     * @param options additional options for the texture
     */
    constructor(effects, source, gl, options) {
        this.uniformLocs = {};
        /** additional channels */
        this.channels = [];
        this.fShaders = [];
        this.textureMode = source instanceof WebGLTexture;
        // set channels if provided with channels
        if ((options === null || options === void 0 ? void 0 : options.channels) !== undefined)
            this.channels = options === null || options === void 0 ? void 0 : options.channels;
        if (!(effects instanceof EffectDictionary)) {
            effects = new EffectDictionary({ default: effects });
        }
        // add the copy to scene texture if in texture mode
        if (this.textureMode) {
            if (settings_1.settings.verbosity > 1) {
                console.log("we are in texture mode!");
            }
            for (const name in effects.effectMap) {
                const list = effects.effectMap[name];
                list.unshift(loop([scenesampleexpr_1.input()]).target(-1));
            }
        }
        this.source = source;
        this.gl = gl;
        this.options = options;
        // set the viewport
        this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
        // set up the vertex buffer
        const vertexBuffer = this.gl.createBuffer();
        if (vertexBuffer === null) {
            throw new Error("problem creating vertex buffer");
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        const vertexArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
        const triangles = new Float32Array(vertexArray);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangles, this.gl.STATIC_DRAW);
        // save the vertex buffer reference just so we can delete it later
        this.vertexBuffer = vertexBuffer;
        // compile the simple vertex shader (2 big triangles)
        const vShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        if (vShader === null) {
            throw new Error("problem creating the vertex shader");
        }
        // save the vertex shader reference just so we can delete it later
        this.vShader = vShader;
        this.gl.shaderSource(vShader, V_SOURCE);
        this.gl.compileShader(vShader);
        // make textures
        this.tex = {
            // make the front texture the source if we're given a texture instead of
            // an image
            back: {
                name: "orig_back",
                tex: source instanceof WebGLTexture
                    ? source
                    : makeTexture(this.gl, this.options),
            },
            front: { name: "orig_front", tex: makeTexture(this.gl, this.options) },
            scene: undefined,
            bufTextures: [],
        };
        // create the framebuffer
        const framebuffer = gl.createFramebuffer();
        if (framebuffer === null) {
            throw new Error("problem creating the framebuffer");
        }
        this.framebuffer = framebuffer;
        const { programMap, needs } = effects.toProgramMap(this.gl, this.vShader, this.uniformLocs, this.fShaders);
        this.programMap = programMap;
        if (needs.sceneBuffer || this.textureMode) {
            // we always create a scene texture if we're in texture mode
            this.tex.scene = {
                name: "scene",
                tex: makeTexture(this.gl, this.options),
            };
        }
        if (programMap["default"] === undefined) {
            throw new Error("no default program");
        }
        this.programLoop = programMap["default"];
        // create x amount of empty textures based on buffers needed
        const channelsNeeded = Math.max(...needs.extraBuffers) + 1;
        const channelsSupplied = this.channels.length;
        if (channelsNeeded > channelsSupplied) {
            throw new Error("not enough channels supplied for this effect");
        }
        for (let i = 0; i < this.channels.length; i++) {
            const texOrImage = this.channels[i];
            if (!(texOrImage instanceof WebGLTexture)) {
                // create a new texture; we will update this with the image source every draw
                const texture = makeTexture(this.gl, this.options);
                this.tex.bufTextures.push({ name: "tex_channel_" + i, tex: texture });
            }
            else {
                // this is already a texture; the user will handle updating this
                this.tex.bufTextures.push({
                    name: "img_channel_" + i,
                    tex: texOrImage,
                });
            }
        }
        if (settings_1.settings.verbosity > 0) {
            console.log(effects);
            console.log(this.programMap);
        }
    }
    /**
     * use the source and channels to draw effect to target context; mouse
     * position (as with all positions) are stored from the bottom left corner as
     * this is how texture data is stored
     * @param timeVal number to set the time uniform to (supply this if you plan to
     * use [[time]])
     * @param mouseX the x position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     * @param mouseY the y position of the mouse (supply this if you plan to use
     * [[mouse]] or [[nmouse]])
     */
    draw(timeVal = 0, mouseX = 0, mouseY = 0) {
        this.gl.activeTexture(this.gl.TEXTURE0 + settings_1.settings.offset);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.back.tex);
        sendTexture(this.gl, this.source);
        // TODO only do unbinding and rebinding in texture mode
        // TODO see if we need to unbind
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        // bind the scene buffer
        if (this.programLoop.getTotalNeeds().sceneBuffer &&
            this.tex.scene !== undefined) {
            this.gl.activeTexture(this.gl.TEXTURE1 + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.scene.tex);
            sendTexture(this.gl, this.source);
            // TODO see if we need to unbind
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // bind the additional buffers
        let counter = 0;
        for (const b of this.channels) {
            // TODO check for texture limit
            this.gl.activeTexture(this.gl.TEXTURE2 + counter + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.tex.bufTextures[counter].tex);
            sendTexture(this.gl, b);
            // TODO see if we need to unbind (this gets rid of the error)
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
            counter++;
        }
        this.programLoop.run(this.gl, this.tex, this.framebuffer, this.uniformLocs, this.programLoop.last, { timeVal: timeVal, mouseX: mouseX, mouseY: mouseY });
    }
    /**
     * delete all resources created by construction of this [[Merger]]; use right before
     * intentionally losing a reference to this merger object. this is useful if you want
     * to construct another [[Merger]] to use new effects
     */
    delete() {
        // TODO do we have to do something with VertexAttribArray?
        // call bind with null on all textures
        for (let i = 0; i < 2 + this.tex.bufTextures.length; i++) {
            // this gets rid of final texture, scene texture and channels
            this.gl.activeTexture(this.gl.TEXTURE0 + i + settings_1.settings.offset);
            this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        }
        // call bind with null on all vertex buffers (just 1)
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        // call bind with null on all frame buffers (just 1)
        // (this might be redundant because this happens at end of draw call)
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        // delete all programs
        this.programLoop.delete(this.gl);
        // delete all textures
        this.gl.deleteTexture(this.tex.front.tex);
        this.gl.deleteTexture(this.tex.back.tex);
        for (const c of this.tex.bufTextures) {
            this.gl.deleteTexture(c.tex);
        }
        // delete all vertex buffers (just 1)
        this.gl.deleteBuffer(this.vertexBuffer);
        // delete all frame buffers (just 1)
        this.gl.deleteFramebuffer(this.framebuffer);
        // delete all vertex shaders (just 1)
        this.gl.deleteShader(this.vShader);
        // delete all fragment shaders
        for (const f of this.fShaders) {
            this.gl.deleteShader(f);
        }
    }
    /**
     * changes the current program loop
     * @param str key in the program map
     */
    changeProgram(str) {
        if (this.programMap[str] === undefined) {
            throw new Error(`program "${str}" doesn't exist on this merger`);
        }
        this.programLoop = this.programMap[str];
    }
}
exports.Merger = Merger;
/** creates a texture given a context and options */
function makeTexture(gl, options) {
    const texture = gl.createTexture();
    if (texture === null) {
        throw new Error("problem creating texture");
    }
    // flip the order of the pixels, or else it displays upside down
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // bind the texture after creating it
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const filterMode = (f) => f === undefined || f === "linear" ? gl.LINEAR : gl.NEAREST;
    // how to map texture element
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.minFilterMode));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode(options === null || options === void 0 ? void 0 : options.maxFilterMode));
    if ((options === null || options === void 0 ? void 0 : options.edgeMode) !== "wrap") {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return texture;
}
exports.makeTexture = makeTexture;
/** copies onto texture */
function sendTexture(gl, src) {
    // if you are using textures instead of images, the user is responsible for
    // updating that texture, so just return
    if (src instanceof WebGLTexture || src === null)
        return;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
}
exports.sendTexture = sendTexture;

},{"./codebuilder":13,"./exprs/expr":27,"./exprs/fragcolorexpr":28,"./exprs/regiondecorator":49,"./exprs/scenesampleexpr":53,"./exprs/setcolorexpr":54,"./exprs/ternaryexpr":57,"./settings":66,"./webglprogramloop":68}],66:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = void 0;
exports.settings = {
    /**
     * set to 1 if you want reasonable logging for debugging, such as the
     * generated GLSL code and program tree. set to 100 if you want texture debug
     * info (you probably don't want to do this, as it logs many lines every
     * frame!)
     */
    verbosity: 0,
    /** texture offset */
    offset: 0,
};

},{}],67:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandWithRegion = exports.brandWithChannel = exports.captureAndAppend = void 0;
const glslfunctions_1 = require("./glslfunctions");
/** @ignore */
function captureAndAppend(str, reg, suffix) {
    const matches = str.match(reg);
    if (matches === null)
        throw new Error("no match in the given string");
    return str.replace(reg, matches[0] + suffix);
}
exports.captureAndAppend = captureAndAppend;
/** @ignore */
function nameExtractor(sourceLists, extra) {
    const origFuncName = sourceLists.sections[0];
    const ending = origFuncName[origFuncName.length - 1] === ")" ? ")" : "";
    const newFuncName = origFuncName.substr(0, origFuncName.length - 1 - ~~(ending === ")")) +
        extra +
        "(" +
        ending;
    return { origFuncName, newFuncName, ending };
}
/** @ignore */
function brandWithChannel(sourceLists, funcs, needs, funcIndex, samplerNum) {
    samplerNum === undefined || samplerNum === -1
        ? (needs.neighborSample = true)
        : (needs.extraBuffers = new Set([samplerNum]));
    if (samplerNum === undefined || samplerNum === -1)
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, samplerNum !== undefined ? "_" + samplerNum : "");
    sourceLists.sections[0] = sourceLists.sections[0]
        .split(origFuncName)
        .join(newFuncName);
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncName)
        .split("uSampler")
        .join("uBufferSampler" + samplerNum);
}
exports.brandWithChannel = brandWithChannel;
/** @ignore */
function brandWithRegion(expr, funcIndex, space) {
    // if it's not a rectangle region we can't do anything so just return
    if (!Array.isArray(space))
        return;
    const sourceLists = expr.sourceLists;
    const funcs = expr.externalFuncs;
    const needs = expr.needs;
    if (expr.regionBranded ||
        (!needs.neighborSample && needs.extraBuffers.size === 0))
        return;
    const { origFuncName, newFuncName, ending } = nameExtractor(sourceLists, "_region");
    const openFuncName = newFuncName.substr(0, newFuncName.length - ~~(ending === ")"));
    const newFuncDeclaration = openFuncName +
        "float r_x_min, float r_y_min, float r_x_max, float r_y_max" +
        (ending === ")" ? ")" : ", ");
    const origTextureName = "texture2D(";
    const newTextureName = "texture2D_region(r_x_min, r_y_min, r_x_max, r_y_max, ";
    // replace name in the external function and `texture2D` and sampler
    // (assumes the sampling function is the first external function)
    funcs[funcIndex] = funcs[funcIndex]
        .split(origFuncName)
        .join(newFuncDeclaration)
        .split(origTextureName)
        .join(newTextureName);
    // shift the original name off the list
    sourceLists.sections.shift();
    // add the close paren if we're opening up a function with 0 args
    if (ending === ")")
        sourceLists.sections.unshift(")");
    // add commas (one less if it is a 0 arg function call)
    for (let i = 0; i < 4 - ~~(ending === ")"); i++) {
        sourceLists.sections.unshift(", ");
    }
    // add the new name to the beginning of the list
    sourceLists.sections.unshift(newFuncName.substr(0, newFuncName.length - ~~(ending === ")")));
    // add values from region data
    sourceLists.values.unshift(...space);
    // put the texture access wrapper at the beginning
    funcs.unshift(glslfunctions_1.glslFuncs.texture2D_region);
    expr.regionBranded = true;
}
exports.brandWithRegion = brandWithRegion;

},{"./glslfunctions":63}],68:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebGLProgramLoop = exports.WebGLProgramLeaf = exports.updateNeeds = void 0;
const settings_1 = require("./settings");
// update me on change to needs
function updateNeeds(acc, curr) {
    return {
        neighborSample: acc.neighborSample || curr.neighborSample,
        centerSample: acc.centerSample || curr.centerSample,
        sceneBuffer: acc.sceneBuffer || curr.sceneBuffer,
        timeUniform: acc.timeUniform || curr.timeUniform,
        mouseUniform: acc.mouseUniform || curr.mouseUniform,
        passCount: acc.passCount || curr.passCount,
        extraBuffers: new Set([...acc.extraBuffers, ...curr.extraBuffers]),
    };
}
exports.updateNeeds = updateNeeds;
class WebGLProgramLeaf {
    constructor(program, totalNeeds, effects) {
        this.program = program;
        this.totalNeeds = totalNeeds;
        this.effects = effects;
    }
}
exports.WebGLProgramLeaf = WebGLProgramLeaf;
/** @ignore */
function getLoc(programElement, gl, name) {
    gl.useProgram(programElement.program);
    const loc = gl.getUniformLocation(programElement.program, name);
    if (loc === null) {
        throw new Error("could not get the " + name + " uniform location");
    }
    return loc;
}
/** recursive data structure of compiled programs */
class WebGLProgramLoop {
    constructor(programElement, loopInfo, gl) {
        //effects: Expr[];
        this.last = false;
        this.counter = 0;
        this.programElement = programElement;
        this.loopInfo = loopInfo;
        if (this.programElement instanceof WebGLProgramLeaf) {
            if (gl === undefined) {
                throw new Error("program element is a program but context is undefined");
            }
            if (this.programElement.totalNeeds.timeUniform) {
                this.timeLoc = getLoc(this.programElement, gl, "uTime");
            }
            if (this.programElement.totalNeeds.mouseUniform) {
                this.mouseLoc = getLoc(this.programElement, gl, "uMouse");
            }
            if (this.programElement.totalNeeds.passCount) {
                this.countLoc = getLoc(this.programElement, gl, "uCount");
            }
        }
    }
    /** get all needs from all programs */
    getTotalNeeds() {
        // go through needs of program loop
        if (!(this.programElement instanceof WebGLProgramLeaf)) {
            const allNeeds = [];
            for (const p of this.programElement) {
                allNeeds.push(p.getTotalNeeds());
            }
            return allNeeds.reduce(updateNeeds);
        }
        return this.programElement.totalNeeds;
    }
    /**
     * recursively uses all programs in the loop, binding the appropriate
     * textures and setting the appropriate uniforms; the user should only have
     * to call [[draw]] on [[Merger]] and never this function directly
     */
    run(gl, tex, framebuffer, uniformLocs, last, defaultUniforms, outerLoop) {
        let savedTexture;
        if (this.loopInfo.target !== undefined &&
            // if there is a target switch:
            (outerLoop === null || outerLoop === void 0 ? void 0 : outerLoop.loopInfo.target) !== this.loopInfo.target) {
            // swap out the back texture for the channel texture if this loop has
            // an alternate render target
            savedTexture = tex.back;
            if (this.loopInfo.target !== -1) {
                tex.back = tex.bufTextures[this.loopInfo.target];
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to target -1 but scene texture was undefined");
                }
                tex.back = tex.scene;
            }
            tex.bufTextures[this.loopInfo.target] = savedTexture;
            if (settings_1.settings.verbosity > 99)
                console.log("saved texture: " + savedTexture.name);
        }
        // setup for program leaf
        if (this.programElement instanceof WebGLProgramLeaf) {
            // bind the scene texture if needed
            if (this.programElement.totalNeeds.sceneBuffer) {
                if (tex.scene === undefined) {
                    throw new Error("needs scene buffer, but scene texture is somehow undefined");
                }
                gl.activeTexture(gl.TEXTURE1 + settings_1.settings.offset);
                if (this.loopInfo.target === -1) {
                    gl.bindTexture(gl.TEXTURE_2D, savedTexture.tex);
                }
                else {
                    gl.bindTexture(gl.TEXTURE_2D, tex.scene.tex);
                }
            }
            // bind all extra channel textures if needed
            for (const n of this.programElement.totalNeeds.extraBuffers) {
                gl.activeTexture(gl.TEXTURE2 + n + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, tex.bufTextures[n].tex);
            }
            // use the current program
            gl.useProgram(this.programElement.program);
            // apply all uniforms
            for (const effect of this.programElement.effects) {
                effect.applyUniforms(gl, uniformLocs);
            }
            // set time uniform if needed
            if (this.programElement.totalNeeds.timeUniform) {
                if (this.timeLoc === undefined ||
                    defaultUniforms.timeVal === undefined) {
                    throw new Error("time or location is undefined");
                }
                gl.uniform1f(this.timeLoc, defaultUniforms.timeVal);
            }
            // set mouse uniforms if needed
            if (this.programElement.totalNeeds.mouseUniform) {
                if (this.mouseLoc === undefined ||
                    defaultUniforms.mouseX === undefined ||
                    defaultUniforms.mouseY === undefined) {
                    throw new Error("mouse uniform or location is undefined");
                }
                gl.uniform2f(this.mouseLoc, defaultUniforms.mouseX, defaultUniforms.mouseY);
            }
            // set count uniform if needed
            if (this.programElement.totalNeeds.passCount && outerLoop !== undefined) {
                if (this.countLoc === undefined) {
                    throw new Error("count location is undefined");
                }
                if (outerLoop !== undefined) {
                    gl.uniform1i(this.countLoc, outerLoop.counter);
                }
                this.counter++;
                const mod = outerLoop === undefined ? 1 : outerLoop.loopInfo.num;
                this.counter %= mod;
            }
        }
        for (let i = 0; i < this.loopInfo.num; i++) {
            const newLast = i === this.loopInfo.num - 1;
            if (this.programElement instanceof WebGLProgramLeaf) {
                if (newLast && last && this.last) {
                    // we are on the final pass of the final loop, so draw screen by
                    // setting to the default framebuffer
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
                else {
                    // we have to bounce between two textures
                    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
                    // use the framebuffer to write to front texture
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.front.tex, 0);
                }
                // allows us to read from `texBack`
                // default sampler is 0, so `uSampler` uniform will always sample from texture 0
                gl.activeTexture(gl.TEXTURE0 + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, tex.back.tex);
                // use our last program as the draw program
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                if (settings_1.settings.verbosity > 99) {
                    console.log("intermediate back", tex.back.name);
                    console.log("intermediate front", tex.front.name);
                }
                // swap back and front
                [tex.back, tex.front] = [tex.front, tex.back];
                // deactivate and unbind all the channel textures needed
                for (const n of this.programElement.totalNeeds.extraBuffers) {
                    gl.activeTexture(gl.TEXTURE2 + n + settings_1.settings.offset);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
                gl.activeTexture(gl.TEXTURE1 + settings_1.settings.offset);
                gl.bindTexture(gl.TEXTURE_2D, null);
            }
            else {
                if (this.loopInfo.func !== undefined) {
                    this.loopInfo.func(i);
                }
                for (const p of this.programElement) {
                    p.run(gl, tex, framebuffer, uniformLocs, newLast, defaultUniforms, this // this is now the outer loop
                    );
                }
            }
        }
        // swap the textures back if we were temporarily using a channel texture
        if (savedTexture !== undefined) {
            const target = this.loopInfo.target;
            if (settings_1.settings.verbosity > 99) {
                console.log("pre final back", tex.back.name);
                console.log("pre final front", tex.front.name);
            }
            // back texture is really the front texture because it was just swapped
            if (this.loopInfo.target !== -1) {
                tex.bufTextures[target] = tex.back;
            }
            else {
                if (tex.scene === undefined) {
                    throw new Error("tried to replace -1 but scene texture was undefined");
                }
                tex.scene = tex.back;
            }
            tex.back = savedTexture;
            if (settings_1.settings.verbosity > 99) {
                console.log("post final back", tex.back.name);
                console.log("post final front", tex.front.name);
                console.log("channel texture", tex.bufTextures[target].name);
            }
        }
    }
    delete(gl) {
        if (this.programElement instanceof WebGLProgramLeaf) {
            gl.deleteProgram(this.programElement.program);
        }
        else {
            for (const p of this.programElement) {
                p.delete(gl);
            }
        }
    }
}
exports.WebGLProgramLoop = WebGLProgramLoop;

},{"./settings":66}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blurandtrace = exports.BlurAndTrace = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class BlurAndTrace extends merge_pass_1.EffectLoop {
    constructor(brightness, blurSize, reps, taps, samplerNum, useDepth) {
        const brightnessFloat = merge_pass_1.float(brightness);
        const blurSizeFloat = merge_pass_1.float(blurSize);
        super([
            ...(!useDepth ? [merge_pass_1.loop([merge_pass_1.channel(samplerNum)]).target(samplerNum)] : []),
            merge_pass_1.blur2d(blurSizeFloat, blurSizeFloat, reps, taps),
            merge_pass_1.edge(brightnessFloat, samplerNum),
        ], { num: 1 });
        this.brightnessFloat = brightnessFloat;
        this.blurSizeFloat = blurSizeFloat;
        this.brightness = brightness;
        this.blurSize = blurSize;
    }
    setBrightness(brightness) {
        this.brightnessFloat.setVal(merge_pass_1.wrapInValue(brightness));
        this.brightness = merge_pass_1.wrapInValue(brightness);
    }
    setBlurSize(blurSize) {
        this.blurSizeFloat.setVal(merge_pass_1.wrapInValue(blurSize));
        this.blurSize = merge_pass_1.wrapInValue(blurSize);
    }
}
exports.BlurAndTrace = BlurAndTrace;
function blurandtrace(brightness = merge_pass_1.mut(1), blurSize = merge_pass_1.mut(1), reps = 4, taps = 9, samplerNum = 0, useDepth = false) {
    return new BlurAndTrace(merge_pass_1.wrapInValue(brightness), merge_pass_1.wrapInValue(blurSize), reps, taps, samplerNum, useDepth);
}
exports.blurandtrace = blurandtrace;

},{"@bandaloo/merge-pass":64}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.celshade = exports.CelShade = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class CelShade extends merge_pass_1.WrappedExpr {
    constructor(mult, bump, center, edge) {
        const multFloat = merge_pass_1.float(mult);
        const bumpFloat = merge_pass_1.float(bump);
        const centerFloat = merge_pass_1.float(center);
        const edgeFloat = merge_pass_1.float(edge);
        const smooth = merge_pass_1.cfloat(merge_pass_1.tag `(smoothstep(-${edgeFloat} + ${centerFloat}, ${edgeFloat} + ${centerFloat}, ${merge_pass_1.rgb2hsv(merge_pass_1.fcolor())}.z) * ${multFloat} + ${bumpFloat})`);
        const expr = merge_pass_1.hsv2rgb(merge_pass_1.changecomp(merge_pass_1.rgb2hsv(merge_pass_1.fcolor()), smooth, "z"));
        super(expr);
        this.multFloat = multFloat;
        this.bumpFloat = bumpFloat;
        this.centerFloat = centerFloat;
        this.edgeFloat = edgeFloat;
        this.mult = mult;
        this.bump = bump;
        this.center = center;
        this.edge = edge;
    }
    setMult(mult) {
        this.multFloat.setVal(merge_pass_1.wrapInValue(mult));
        this.mult = merge_pass_1.wrapInValue(mult);
    }
    setBump(bump) {
        this.bumpFloat.setVal(merge_pass_1.wrapInValue(bump));
        this.bump = merge_pass_1.wrapInValue(bump);
    }
    setCenter(center) {
        this.centerFloat.setVal(merge_pass_1.wrapInValue(center));
        this.center = merge_pass_1.wrapInValue(center);
    }
    setEdge(edge) {
        this.edgeFloat.setVal(merge_pass_1.wrapInValue(edge));
        this.edge = merge_pass_1.wrapInValue(edge);
    }
}
exports.CelShade = CelShade;
function celshade(mult = merge_pass_1.mut(0.8), bump = merge_pass_1.mut(0.3), center = merge_pass_1.mut(0.3), edge = merge_pass_1.mut(0.03)) {
    return new CelShade(merge_pass_1.wrapInValue(mult), merge_pass_1.wrapInValue(bump), merge_pass_1.wrapInValue(center), merge_pass_1.wrapInValue(edge));
}
exports.celshade = celshade;

},{"@bandaloo/merge-pass":64}],71:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foggyrays = exports.FoggyRaysExpr = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class FoggyRaysExpr extends merge_pass_1.WrappedExpr {
    constructor(period, speed, throwDistance, numSamples, samplerNum, convertDepthColor) {
        const periodFloat = merge_pass_1.float(period);
        const speedFloat = merge_pass_1.float(speed);
        const throwDistanceFloat = merge_pass_1.float(throwDistance);
        const fog = merge_pass_1.op(merge_pass_1.op(merge_pass_1.simplex(merge_pass_1.op(merge_pass_1.op(merge_pass_1.pos(), "+", merge_pass_1.op(merge_pass_1.op(merge_pass_1.time(), "*", speedFloat), "/", periodFloat)), "*", merge_pass_1.op(merge_pass_1.resolution(), "/", merge_pass_1.op(periodFloat, "*", 2)))), "*", merge_pass_1.simplex(merge_pass_1.op(merge_pass_1.op(merge_pass_1.pos(), "+", merge_pass_1.op(merge_pass_1.op(merge_pass_1.time(), "*", speedFloat), "/", merge_pass_1.op(periodFloat, "*", -2))), "*", merge_pass_1.op(merge_pass_1.resolution(), "/", merge_pass_1.op(periodFloat, "*", 4))))), "*", 0.5);
        const expr = merge_pass_1.godrays({
            weight: 0.009,
            density: merge_pass_1.op(throwDistanceFloat, "+", merge_pass_1.op(fog, "*", 0.5)),
            convertDepth: convertDepthColor !== undefined
                ? { threshold: 0.01, newColor: convertDepthColor }
                : undefined,
            samplerNum: samplerNum,
            numSamples: numSamples,
        });
        super(expr);
        this.periodFloat = periodFloat;
        this.speedFloat = speedFloat;
        this.throwDistanceFloat = throwDistanceFloat;
        this.godraysExpr = expr;
        this.convertsDepth = convertDepthColor !== undefined;
        this.period = period;
        this.speed = speed;
        this.throwDistance = throwDistance;
    }
    setPeriod(period) {
        this.periodFloat.setVal(merge_pass_1.wrapInValue(period));
        this.period = merge_pass_1.wrapInValue(period);
    }
    setSpeed(speed) {
        this.speedFloat.setVal(merge_pass_1.wrapInValue(speed));
        this.speed = merge_pass_1.wrapInValue(speed);
    }
    setThrowDistance(throwDistance) {
        this.throwDistanceFloat.setVal(merge_pass_1.wrapInValue(throwDistance));
        this.throwDistance = merge_pass_1.wrapInValue(throwDistance);
    }
    setNewColor(newColor) {
        if (this.convertsDepth === undefined) {
            throw new Error("can only set new color if you are converting from a depth buffer");
        }
        this.godraysExpr.setNewColor(newColor);
    }
}
exports.FoggyRaysExpr = FoggyRaysExpr;
function foggyrays(period = merge_pass_1.mut(100), speed = merge_pass_1.mut(1), throwDistance = merge_pass_1.mut(0.3), numSamples = 100, samplerNum, convertDepthColor) {
    return new FoggyRaysExpr(merge_pass_1.wrapInValue(period), merge_pass_1.wrapInValue(speed), merge_pass_1.wrapInValue(throwDistance), numSamples, samplerNum, convertDepthColor);
}
exports.foggyrays = foggyrays;

},{"@bandaloo/merge-pass":64}],72:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./foggyrays"), exports);
__exportStar(require("./vignette"), exports);
__exportStar(require("./blurandtrace"), exports);
__exportStar(require("./lightbands"), exports);
__exportStar(require("./noisedisplacement"), exports);
__exportStar(require("./oldfilm"), exports);
__exportStar(require("./kaleidoscope"), exports);
__exportStar(require("./celshade"), exports);

},{"./blurandtrace":69,"./celshade":70,"./foggyrays":71,"./kaleidoscope":73,"./lightbands":74,"./noisedisplacement":75,"./oldfilm":76,"./vignette":77}],73:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kaleidoscope = exports.Kaleidoscope = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class Kaleidoscope extends merge_pass_1.WrappedExpr {
    constructor(sides, scale) {
        const sidesFloat = merge_pass_1.float(sides);
        const scaleFloat = merge_pass_1.float(scale);
        const tpos = merge_pass_1.op(merge_pass_1.translate(merge_pass_1.pos(), merge_pass_1.vec2(-0.5, -0.5)), "/", scaleFloat);
        const angle = merge_pass_1.a2("atan", merge_pass_1.getcomp(tpos, "y"), merge_pass_1.getcomp(tpos, "x"));
        const b = merge_pass_1.op(2 * Math.PI, "*", merge_pass_1.op(1, "/", sidesFloat));
        const mangle = merge_pass_1.op(merge_pass_1.a1("floor", merge_pass_1.op(angle, "/", b)), "*", b);
        const a = merge_pass_1.op(angle, "-", mangle);
        const flip = merge_pass_1.op(b, "-", merge_pass_1.op(2, "*", a));
        const sign = merge_pass_1.a1("floor", merge_pass_1.op(merge_pass_1.a2("mod", merge_pass_1.op(mangle, "+", 0.1), merge_pass_1.op(b, "*", 2)), "/", b));
        const spos = merge_pass_1.translate(merge_pass_1.rotate(tpos, merge_pass_1.op(mangle, "-", merge_pass_1.op(flip, "*", sign))), merge_pass_1.vec2(0.5, 0.5));
        super(merge_pass_1.channel(-1, spos));
        this.sidesFloat = sidesFloat;
        this.scaleFloat = scaleFloat;
        this.sides = sides;
        this.scale = scale;
    }
    setSides(sides) {
        this.sidesFloat.setVal(merge_pass_1.wrapInValue(sides));
        this.sides = merge_pass_1.wrapInValue(sides);
    }
    setScale(scale) {
        this.scaleFloat.setVal(merge_pass_1.wrapInValue(scale));
        this.scale = merge_pass_1.wrapInValue(scale);
    }
}
exports.Kaleidoscope = Kaleidoscope;
function kaleidoscope(sides = merge_pass_1.mut(8), scale = merge_pass_1.mut(1)) {
    return new Kaleidoscope(merge_pass_1.wrapInValue(sides), merge_pass_1.wrapInValue(scale));
}
exports.kaleidoscope = kaleidoscope;

},{"@bandaloo/merge-pass":64}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightbands = exports.LightBands = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class LightBands extends merge_pass_1.WrappedExpr {
    constructor(speed, intensity, threshold, samplerNum) {
        const speedFloat = merge_pass_1.float(speed);
        const intensityFloat = merge_pass_1.float(intensity);
        const thresholdFloat = merge_pass_1.float(threshold);
        const expr = merge_pass_1.brightness(merge_pass_1.ternary(merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.channel(0), "r"), "-", thresholdFloat), merge_pass_1.op(merge_pass_1.a1("sin", merge_pass_1.op(merge_pass_1.op(merge_pass_1.time(), "*", speedFloat), "+", merge_pass_1.truedepth(merge_pass_1.getcomp(merge_pass_1.channel(samplerNum), "r")))), "*", intensityFloat), 0));
        super(expr);
        this.speedFloat = speedFloat;
        this.intensityFloat = intensityFloat;
        this.thresholdFloat = thresholdFloat;
        this.speed = speed;
        this.intensity = intensity;
        this.threshold = threshold;
    }
    setSpeed(speed) {
        this.speedFloat.setVal(merge_pass_1.wrapInValue(speed));
        this.speed = merge_pass_1.wrapInValue(speed);
    }
    setIntensity(intensity) {
        this.intensityFloat.setVal(merge_pass_1.wrapInValue(intensity));
        this.intensity = merge_pass_1.wrapInValue(intensity);
    }
    setThreshold(threshold) {
        this.thresholdFloat.setVal(merge_pass_1.wrapInValue(threshold));
        this.threshold = merge_pass_1.wrapInValue(threshold);
    }
}
exports.LightBands = LightBands;
function lightbands(speed = merge_pass_1.mut(4), intensity = merge_pass_1.mut(0.3), threshold = merge_pass_1.mut(0.01), samplerNum = 0) {
    return new LightBands(merge_pass_1.wrapInValue(speed), merge_pass_1.wrapInValue(intensity), merge_pass_1.wrapInValue(threshold), samplerNum);
}
exports.lightbands = lightbands;

},{"@bandaloo/merge-pass":64}],75:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noisedisplacement = exports.NoiseDisplacement = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
const X_OFF = 1234;
const Y_OFF = 5678;
class NoiseDisplacement extends merge_pass_1.WrappedExpr {
    constructor(period, speed, intensity) {
        const periodFloat = merge_pass_1.float(period);
        const speedFloat = merge_pass_1.float(speed);
        const intensityFloat = merge_pass_1.float(intensity);
        const noise = (comp) => merge_pass_1.simplex(merge_pass_1.op(merge_pass_1.op(merge_pass_1.changecomp(merge_pass_1.op(merge_pass_1.pos(), "/", periodFloat), merge_pass_1.op(merge_pass_1.time(), "*", speedFloat), comp, "+"), "*", merge_pass_1.op(merge_pass_1.resolution(), "/", merge_pass_1.getcomp(merge_pass_1.resolution(), "y"))), "+", comp === "x" ? X_OFF : Y_OFF));
        super(merge_pass_1.channel(-1, merge_pass_1.op(merge_pass_1.op(merge_pass_1.op(merge_pass_1.vec2(noise("x"), noise("y")), "*", intensityFloat), "*", merge_pass_1.op(merge_pass_1.get2comp(merge_pass_1.resolution(), "yx"), "/", merge_pass_1.getcomp(merge_pass_1.resolution(), "y"))), "+", merge_pass_1.pos())));
        this.periodFloat = periodFloat;
        this.speedFloat = speedFloat;
        this.intensityFloat = intensityFloat;
        this.period = period;
        this.speed = speed;
        this.intensity = intensity;
    }
    setPeriod(period) {
        this.periodFloat.setVal(merge_pass_1.wrapInValue(period));
        this.period = merge_pass_1.wrapInValue(period);
    }
    setSpeed(speed) {
        this.speedFloat.setVal(merge_pass_1.wrapInValue(speed));
        this.speed = merge_pass_1.wrapInValue(speed);
    }
    setIntensity(intensity) {
        this.intensityFloat.setVal(merge_pass_1.wrapInValue(intensity));
        this.speed = merge_pass_1.wrapInValue(intensity);
    }
}
exports.NoiseDisplacement = NoiseDisplacement;
function noisedisplacement(period = merge_pass_1.mut(0.1), speed = merge_pass_1.mut(1), intensity = merge_pass_1.mut(0.005)) {
    return new NoiseDisplacement(merge_pass_1.wrapInValue(period), merge_pass_1.wrapInValue(speed), merge_pass_1.wrapInValue(intensity));
}
exports.noisedisplacement = noisedisplacement;

},{"@bandaloo/merge-pass":64}],76:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oldfilm = exports.OldFilm = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class OldFilm extends merge_pass_1.WrappedExpr {
    constructor(speckIntensity, lineIntensity, grainIntensity) {
        const speckIntensityFloat = merge_pass_1.float(speckIntensity);
        const lineIntensityFloat = merge_pass_1.float(lineIntensity);
        const grainIntensityFloat = merge_pass_1.float(grainIntensity);
        const ftime = merge_pass_1.a1("floor", merge_pass_1.op(merge_pass_1.time(), "*", 24));
        const grainy = merge_pass_1.op(merge_pass_1.random(merge_pass_1.op(merge_pass_1.pixel(), "+", merge_pass_1.a2("mod", merge_pass_1.op(ftime, "*", 99), 3000))), "*", grainIntensityFloat);
        const rate = 10;
        const triangles = merge_pass_1.op(merge_pass_1.op(merge_pass_1.op(merge_pass_1.a1("abs", merge_pass_1.op(merge_pass_1.op(2, "*", merge_pass_1.a1("fract", merge_pass_1.op(rate, "*", merge_pass_1.getcomp(merge_pass_1.pos(), "x")))), "-", 1)), "-", 0.5), "*", 2), "*", lineIntensityFloat);
        const stepping = merge_pass_1.a2("step", merge_pass_1.op(1, "-", merge_pass_1.op(1, "/", rate * 12)), merge_pass_1.a2("mod", merge_pass_1.op(merge_pass_1.getcomp(merge_pass_1.pos(), "x"), "+", merge_pass_1.random(merge_pass_1.op(merge_pass_1.vec2(50, 50), "*", merge_pass_1.time()))), 1));
        const lines = merge_pass_1.op(triangles, "*", stepping);
        const spos = merge_pass_1.a2("mod", merge_pass_1.op(merge_pass_1.op(merge_pass_1.pos(), "*", merge_pass_1.op(merge_pass_1.resolution(), "/", merge_pass_1.getcomp(merge_pass_1.resolution(), "y"))), "+", ftime), merge_pass_1.vec2(100, 100));
        const fsimplex = merge_pass_1.op(merge_pass_1.op(merge_pass_1.simplex(merge_pass_1.op(spos, "*", 7)), "*", 0.44), "+", 0.5);
        const spots = merge_pass_1.op(merge_pass_1.a2("step", fsimplex, 0.08), "*", speckIntensityFloat);
        super(merge_pass_1.monochrome(merge_pass_1.brightness(spots, merge_pass_1.brightness(lines, merge_pass_1.brightness(grainy)))));
        this.speckIntensityFloat = speckIntensityFloat;
        this.lineIntensityFloat = lineIntensityFloat;
        this.grainIntensityFloat = grainIntensityFloat;
        this.speckIntensity = speckIntensity;
        this.lineIntensity = lineIntensity;
        this.grainIntensity = grainIntensity;
    }
    setSpeckIntensity(speckIntensity) {
        this.speckIntensityFloat.setVal(merge_pass_1.wrapInValue(speckIntensity));
        this.speckIntensity = merge_pass_1.wrapInValue(speckIntensity);
    }
    setLineIntensity(lineIntensity) {
        this.lineIntensityFloat.setVal(merge_pass_1.wrapInValue(lineIntensity));
        this.lineIntensity = merge_pass_1.wrapInValue(lineIntensity);
    }
    setGrainIntensity(grainIntensity) {
        this.grainIntensityFloat.setVal(merge_pass_1.wrapInValue(grainIntensity));
        this.grainIntensity = merge_pass_1.wrapInValue(grainIntensity);
    }
}
exports.OldFilm = OldFilm;
function oldfilm(speckIntensity = merge_pass_1.mut(0.4), lineIntensity = merge_pass_1.mut(0.12), grainIntensity = merge_pass_1.mut(0.11)) {
    return new OldFilm(merge_pass_1.wrapInValue(speckIntensity), merge_pass_1.wrapInValue(lineIntensity), merge_pass_1.wrapInValue(grainIntensity));
}
exports.oldfilm = oldfilm;

},{"@bandaloo/merge-pass":64}],77:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vignette = exports.Vignette = void 0;
const merge_pass_1 = require("@bandaloo/merge-pass");
class Vignette extends merge_pass_1.EffectLoop {
    constructor(blurScalar, brightnessScalar, brightnessExponent) {
        const blurScalarFloat = merge_pass_1.float(blurScalar);
        const brightnessScalarFloat = merge_pass_1.float(brightnessScalar);
        const brightnessExponentFloat = merge_pass_1.float(brightnessExponent);
        const blurLen = merge_pass_1.op(merge_pass_1.len(merge_pass_1.center()), "*", blurScalarFloat);
        const blurExpr = merge_pass_1.blur2d(blurLen, blurLen);
        const brightLen = merge_pass_1.a2("pow", merge_pass_1.len(merge_pass_1.center()), brightnessExponentFloat);
        const brightExpr = merge_pass_1.brightness(merge_pass_1.op(brightLen, "*", merge_pass_1.op(brightnessScalarFloat, "*", -1)));
        super([blurExpr, brightExpr], { num: 1 });
        this.blurScalarFloat = blurScalarFloat;
        this.brightnessScalarFloat = brightnessScalarFloat;
        this.brightnessExponentFloat = brightnessExponentFloat;
        this.blurScalar = blurScalar;
        this.brightnessScalar = brightnessScalar;
        this.brightnessExponent = brightnessExponent;
    }
    setBlurScalar(blurScalar) {
        this.blurScalarFloat.setVal(merge_pass_1.wrapInValue(blurScalar));
        this.blurScalar = merge_pass_1.wrapInValue(blurScalar);
    }
    setBrightnessScalar(brightnessScalar) {
        this.brightnessScalarFloat.setVal(merge_pass_1.wrapInValue(brightnessScalar));
        this.brightnessScalar = merge_pass_1.wrapInValue(brightnessScalar);
    }
    setBrightnessExponent(brightnessExponent) {
        this.brightnessExponentFloat.setVal(merge_pass_1.wrapInValue(brightnessExponent));
        this.brightnessExponent = merge_pass_1.wrapInValue(brightnessExponent);
    }
}
exports.Vignette = Vignette;
function vignette(blurScalar = merge_pass_1.mut(3), brightnessScalar = merge_pass_1.mut(1.8), brightnessExponent = merge_pass_1.mut(1.8)) {
    return new Vignette(merge_pass_1.wrapInValue(blurScalar), merge_pass_1.wrapInValue(brightnessScalar), merge_pass_1.wrapInValue(brightnessExponent));
}
exports.vignette = vignette;

},{"@bandaloo/merge-pass":64}],78:[function(require,module,exports){
// A library of seedable RNGs implemented in Javascript.
//
// Usage:
//
// var seedrandom = require('seedrandom');
// var random = seedrandom(1); // or any seed.
// var x = random();       // 0 <= x < 1.  Every bit is random.
// var x = random.quick(); // 0 <= x < 1.  32 bits of randomness.

// alea, a 53-bit multiply-with-carry generator by Johannes Baagøe.
// Period: ~2^116
// Reported to pass all BigCrush tests.
var alea = require('./lib/alea');

// xor128, a pure xor-shift generator by George Marsaglia.
// Period: 2^128-1.
// Reported to fail: MatrixRank and LinearComp.
var xor128 = require('./lib/xor128');

// xorwow, George Marsaglia's 160-bit xor-shift combined plus weyl.
// Period: 2^192-2^32
// Reported to fail: CollisionOver, SimpPoker, and LinearComp.
var xorwow = require('./lib/xorwow');

// xorshift7, by François Panneton and Pierre L'ecuyer, takes
// a different approach: it adds robustness by allowing more shifts
// than Marsaglia's original three.  It is a 7-shift generator
// with 256 bits, that passes BigCrush with no systmatic failures.
// Period 2^256-1.
// No systematic BigCrush failures reported.
var xorshift7 = require('./lib/xorshift7');

// xor4096, by Richard Brent, is a 4096-bit xor-shift with a
// very long period that also adds a Weyl generator. It also passes
// BigCrush with no systematic failures.  Its long period may
// be useful if you have many generators and need to avoid
// collisions.
// Period: 2^4128-2^32.
// No systematic BigCrush failures reported.
var xor4096 = require('./lib/xor4096');

// Tyche-i, by Samuel Neves and Filipe Araujo, is a bit-shifting random
// number generator derived from ChaCha, a modern stream cipher.
// https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf
// Period: ~2^127
// No systematic BigCrush failures reported.
var tychei = require('./lib/tychei');

// The original ARC4-based prng included in this library.
// Period: ~2^1600
var sr = require('./seedrandom');

sr.alea = alea;
sr.xor128 = xor128;
sr.xorwow = xorwow;
sr.xorshift7 = xorshift7;
sr.xor4096 = xor4096;
sr.tychei = tychei;

module.exports = sr;

},{"./lib/alea":79,"./lib/tychei":80,"./lib/xor128":81,"./lib/xor4096":82,"./lib/xorshift7":83,"./lib/xorwow":84,"./seedrandom":85}],79:[function(require,module,exports){
// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror
// Original work is under MIT license -

// Copyright (C) 2010 by Johannes Baagøe <baagoe@baagoe.org>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.



(function(global, module, define) {

function Alea(seed) {
  var me = this, mash = Mash();

  me.next = function() {
    var t = 2091639 * me.s0 + me.c * 2.3283064365386963e-10; // 2^-32
    me.s0 = me.s1;
    me.s1 = me.s2;
    return me.s2 = t - (me.c = t | 0);
  };

  // Apply the seeding algorithm from Baagoe.
  me.c = 1;
  me.s0 = mash(' ');
  me.s1 = mash(' ');
  me.s2 = mash(' ');
  me.s0 -= mash(seed);
  if (me.s0 < 0) { me.s0 += 1; }
  me.s1 -= mash(seed);
  if (me.s1 < 0) { me.s1 += 1; }
  me.s2 -= mash(seed);
  if (me.s2 < 0) { me.s2 += 1; }
  mash = null;
}

function copy(f, t) {
  t.c = f.c;
  t.s0 = f.s0;
  t.s1 = f.s1;
  t.s2 = f.s2;
  return t;
}

function impl(seed, opts) {
  var xg = new Alea(seed),
      state = opts && opts.state,
      prng = xg.next;
  prng.int32 = function() { return (xg.next() * 0x100000000) | 0; }
  prng.double = function() {
    return prng() + (prng() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
  };
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = String(data);
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  return mash;
}


if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.alea = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],80:[function(require,module,exports){
// A Javascript implementaion of the "Tyche-i" prng algorithm by
// Samuel Neves and Filipe Araujo.
// See https://eden.dei.uc.pt/~sneves/pubs/2011-snfa2.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var b = me.b, c = me.c, d = me.d, a = me.a;
    b = (b << 25) ^ (b >>> 7) ^ c;
    c = (c - d) | 0;
    d = (d << 24) ^ (d >>> 8) ^ a;
    a = (a - b) | 0;
    me.b = b = (b << 20) ^ (b >>> 12) ^ c;
    me.c = c = (c - d) | 0;
    me.d = (d << 16) ^ (c >>> 16) ^ a;
    return me.a = (a - b) | 0;
  };

  /* The following is non-inverted tyche, which has better internal
   * bit diffusion, but which is about 25% slower than tyche-i in JS.
  me.next = function() {
    var a = me.a, b = me.b, c = me.c, d = me.d;
    a = (me.a + me.b | 0) >>> 0;
    d = me.d ^ a; d = d << 16 ^ d >>> 16;
    c = me.c + d | 0;
    b = me.b ^ c; b = b << 12 ^ d >>> 20;
    me.a = a = a + b | 0;
    d = d ^ a; me.d = d = d << 8 ^ d >>> 24;
    me.c = c = c + d | 0;
    b = b ^ c;
    return me.b = (b << 7 ^ b >>> 25);
  }
  */

  me.a = 0;
  me.b = 0;
  me.c = 2654435769 | 0;
  me.d = 1367130551;

  if (seed === Math.floor(seed)) {
    // Integer seed.
    me.a = (seed / 0x100000000) | 0;
    me.b = seed | 0;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 20; k++) {
    me.b ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.a = f.a;
  t.b = f.b;
  t.c = f.c;
  t.d = f.d;
  return t;
};

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.tychei = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],81:[function(require,module,exports){
// A Javascript implementaion of the "xor128" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;

  // Set up generator function.
  me.next = function() {
    var t = me.x ^ (me.x << 11);
    me.x = me.y;
    me.y = me.z;
    me.z = me.w;
    return me.w ^= (me.w >>> 19) ^ t ^ (t >>> 8);
  };

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor128 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],82:[function(require,module,exports){
// A Javascript implementaion of Richard Brent's Xorgens xor4096 algorithm.
//
// This fast non-cryptographic random number generator is designed for
// use in Monte-Carlo algorithms. It combines a long-period xorshift
// generator with a Weyl generator, and it passes all common batteries
// of stasticial tests for randomness while consuming only a few nanoseconds
// for each prng generated.  For background on the generator, see Brent's
// paper: "Some long-period random number generators using shifts and xors."
// http://arxiv.org/pdf/1004.3115v1.pdf
//
// Usage:
//
// var xor4096 = require('xor4096');
// random = xor4096(1);                        // Seed with int32 or string.
// assert.equal(random(), 0.1520436450538547); // (0, 1) range, 53 bits.
// assert.equal(random.int32(), 1806534897);   // signed int32, 32 bits.
//
// For nonzero numeric keys, this impelementation provides a sequence
// identical to that by Brent's xorgens 3 implementaion in C.  This
// implementation also provides for initalizing the generator with
// string seeds, or for saving and restoring the state of the generator.
//
// On Chrome, this prng benchmarks about 2.1 times slower than
// Javascript's built-in Math.random().

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    var w = me.w,
        X = me.X, i = me.i, t, v;
    // Update Weyl generator.
    me.w = w = (w + 0x61c88647) | 0;
    // Update xor generator.
    v = X[(i + 34) & 127];
    t = X[i = ((i + 1) & 127)];
    v ^= v << 13;
    t ^= t << 17;
    v ^= v >>> 15;
    t ^= t >>> 12;
    // Update Xor generator array state.
    v = X[i] = v ^ t;
    me.i = i;
    // Result is the combination.
    return (v + (w ^ (w >>> 16))) | 0;
  };

  function init(me, seed) {
    var t, v, i, j, w, X = [], limit = 128;
    if (seed === (seed | 0)) {
      // Numeric seeds initialize v, which is used to generates X.
      v = seed;
      seed = null;
    } else {
      // String seeds are mixed into v and X one character at a time.
      seed = seed + '\0';
      v = 0;
      limit = Math.max(limit, seed.length);
    }
    // Initialize circular array and weyl value.
    for (i = 0, j = -32; j < limit; ++j) {
      // Put the unicode characters into the array, and shuffle them.
      if (seed) v ^= seed.charCodeAt((j + 32) % seed.length);
      // After 32 shuffles, take v as the starting w value.
      if (j === 0) w = v;
      v ^= v << 10;
      v ^= v >>> 15;
      v ^= v << 4;
      v ^= v >>> 13;
      if (j >= 0) {
        w = (w + 0x61c88647) | 0;     // Weyl.
        t = (X[j & 127] ^= (v + w));  // Combine xor and weyl to init array.
        i = (0 == t) ? i + 1 : 0;     // Count zeroes.
      }
    }
    // We have detected all zeroes; make the key nonzero.
    if (i >= 128) {
      X[(seed && seed.length || 0) & 127] = -1;
    }
    // Run the generator 512 times to further mix the state before using it.
    // Factoring this as a function slows the main generator, so it is just
    // unrolled here.  The weyl generator is not advanced while warming up.
    i = 127;
    for (j = 4 * 128; j > 0; --j) {
      v = X[(i + 34) & 127];
      t = X[i = ((i + 1) & 127)];
      v ^= v << 13;
      t ^= t << 17;
      v ^= v >>> 15;
      t ^= t >>> 12;
      X[i] = v ^ t;
    }
    // Storing state as object members is faster than using closure variables.
    me.w = w;
    me.X = X;
    me.i = i;
  }

  init(me, seed);
}

function copy(f, t) {
  t.i = f.i;
  t.w = f.w;
  t.X = f.X.slice();
  return t;
};

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.X) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xor4096 = impl;
}

})(
  this,                                     // window object or global
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);

},{}],83:[function(require,module,exports){
// A Javascript implementaion of the "xorshift7" algorithm by
// François Panneton and Pierre L'ecuyer:
// "On the Xorgshift Random Number Generators"
// http://saluc.engr.uconn.edu/refs/crypto/rng/panneton05onthexorshift.pdf

(function(global, module, define) {

function XorGen(seed) {
  var me = this;

  // Set up generator function.
  me.next = function() {
    // Update xor generator.
    var X = me.x, i = me.i, t, v, w;
    t = X[i]; t ^= (t >>> 7); v = t ^ (t << 24);
    t = X[(i + 1) & 7]; v ^= t ^ (t >>> 10);
    t = X[(i + 3) & 7]; v ^= t ^ (t >>> 3);
    t = X[(i + 4) & 7]; v ^= t ^ (t << 7);
    t = X[(i + 7) & 7]; t = t ^ (t << 13); v ^= t ^ (t << 9);
    X[i] = v;
    me.i = (i + 1) & 7;
    return v;
  };

  function init(me, seed) {
    var j, w, X = [];

    if (seed === (seed | 0)) {
      // Seed state array using a 32-bit integer.
      w = X[0] = seed;
    } else {
      // Seed state using a string.
      seed = '' + seed;
      for (j = 0; j < seed.length; ++j) {
        X[j & 7] = (X[j & 7] << 15) ^
            (seed.charCodeAt(j) + X[(j + 1) & 7] << 13);
      }
    }
    // Enforce an array length of 8, not all zeroes.
    while (X.length < 8) X.push(0);
    for (j = 0; j < 8 && X[j] === 0; ++j);
    if (j == 8) w = X[7] = -1; else w = X[j];

    me.x = X;
    me.i = 0;

    // Discard an initial 256 values.
    for (j = 256; j > 0; --j) {
      me.next();
    }
  }

  init(me, seed);
}

function copy(f, t) {
  t.x = f.x.slice();
  t.i = f.i;
  return t;
}

function impl(seed, opts) {
  if (seed == null) seed = +(new Date);
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (state.x) copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorshift7 = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);


},{}],84:[function(require,module,exports){
// A Javascript implementaion of the "xorwow" prng algorithm by
// George Marsaglia.  See http://www.jstatsoft.org/v08/i14/paper

(function(global, module, define) {

function XorGen(seed) {
  var me = this, strseed = '';

  // Set up generator function.
  me.next = function() {
    var t = (me.x ^ (me.x >>> 2));
    me.x = me.y; me.y = me.z; me.z = me.w; me.w = me.v;
    return (me.d = (me.d + 362437 | 0)) +
       (me.v = (me.v ^ (me.v << 4)) ^ (t ^ (t << 1))) | 0;
  };

  me.x = 0;
  me.y = 0;
  me.z = 0;
  me.w = 0;
  me.v = 0;

  if (seed === (seed | 0)) {
    // Integer seed.
    me.x = seed;
  } else {
    // String seed.
    strseed += seed;
  }

  // Mix in string seed, then discard an initial batch of 64 values.
  for (var k = 0; k < strseed.length + 64; k++) {
    me.x ^= strseed.charCodeAt(k) | 0;
    if (k == strseed.length) {
      me.d = me.x << 10 ^ me.x >>> 4;
    }
    me.next();
  }
}

function copy(f, t) {
  t.x = f.x;
  t.y = f.y;
  t.z = f.z;
  t.w = f.w;
  t.v = f.v;
  t.d = f.d;
  return t;
}

function impl(seed, opts) {
  var xg = new XorGen(seed),
      state = opts && opts.state,
      prng = function() { return (xg.next() >>> 0) / 0x100000000; };
  prng.double = function() {
    do {
      var top = xg.next() >>> 11,
          bot = (xg.next() >>> 0) / 0x100000000,
          result = (top + bot) / (1 << 21);
    } while (result === 0);
    return result;
  };
  prng.int32 = xg.next;
  prng.quick = prng;
  if (state) {
    if (typeof(state) == 'object') copy(state, xg);
    prng.state = function() { return copy(xg, {}); }
  }
  return prng;
}

if (module && module.exports) {
  module.exports = impl;
} else if (define && define.amd) {
  define(function() { return impl; });
} else {
  this.xorwow = impl;
}

})(
  this,
  (typeof module) == 'object' && module,    // present in node.js
  (typeof define) == 'function' && define   // present with an AMD loader
);



},{}],85:[function(require,module,exports){
/*
Copyright 2019 David Bau.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

(function (global, pool, math) {
//
// The following constants are related to IEEE 754 limits.
//

var width = 256,        // each RC4 output is 0 <= x < 256
    chunks = 6,         // at least six RC4 outputs for each double
    digits = 52,        // there are 52 significant digits in a double
    rngname = 'random', // rngname: name for Math.random and Math.seedrandom
    startdenom = math.pow(width, chunks),
    significance = math.pow(2, digits),
    overflow = significance * 2,
    mask = width - 1,
    nodecrypto;         // node.js crypto module, initialized at the bottom.

//
// seedrandom()
// This is the seedrandom function described above.
//
function seedrandom(seed, options, callback) {
  var key = [];
  options = (options == true) ? { entropy: true } : (options || {});

  // Flatten the seed string or build one from local entropy if needed.
  var shortseed = mixkey(flatten(
    options.entropy ? [seed, tostring(pool)] :
    (seed == null) ? autoseed() : seed, 3), key);

  // Use the seed to initialize an ARC4 generator.
  var arc4 = new ARC4(key);

  // This function returns a random double in [0, 1) that contains
  // randomness in every bit of the mantissa of the IEEE 754 value.
  var prng = function() {
    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
        d = startdenom,                 //   and denominator d = 2 ^ 48.
        x = 0;                          //   and no 'extra last byte'.
    while (n < significance) {          // Fill up all significant digits by
      n = (n + x) * width;              //   shifting numerator and
      d *= width;                       //   denominator and generating a
      x = arc4.g(1);                    //   new least-significant-byte.
    }
    while (n >= overflow) {             // To avoid rounding up, before adding
      n /= 2;                           //   last byte, shift everything
      d /= 2;                           //   right using integer math until
      x >>>= 1;                         //   we have exactly the desired bits.
    }
    return (n + x) / d;                 // Form the number within [0, 1).
  };

  prng.int32 = function() { return arc4.g(4) | 0; }
  prng.quick = function() { return arc4.g(4) / 0x100000000; }
  prng.double = prng;

  // Mix the randomness into accumulated entropy.
  mixkey(tostring(arc4.S), pool);

  // Calling convention: what to return as a function of prng, seed, is_math.
  return (options.pass || callback ||
      function(prng, seed, is_math_call, state) {
        if (state) {
          // Load the arc4 state from the given state if it has an S array.
          if (state.S) { copy(state, arc4); }
          // Only provide the .state method if requested via options.state.
          prng.state = function() { return copy(arc4, {}); }
        }

        // If called as a method of Math (Math.seedrandom()), mutate
        // Math.random because that is how seedrandom.js has worked since v1.0.
        if (is_math_call) { math[rngname] = prng; return seed; }

        // Otherwise, it is a newer calling convention, so return the
        // prng directly.
        else return prng;
      })(
  prng,
  shortseed,
  'global' in options ? options.global : (this == math),
  options.state);
}

//
// ARC4
//
// An ARC4 implementation.  The constructor takes a key in the form of
// an array of at most (width) integers that should be 0 <= x < (width).
//
// The g(count) method returns a pseudorandom integer that concatenates
// the next (count) outputs from ARC4.  Its return value is a number x
// that is in the range 0 <= x < (width ^ count).
//
function ARC4(key) {
  var t, keylen = key.length,
      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

  // The empty key [] is treated as [0].
  if (!keylen) { key = [keylen++]; }

  // Set up S using the standard key scheduling algorithm.
  while (i < width) {
    s[i] = i++;
  }
  for (i = 0; i < width; i++) {
    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
    s[j] = t;
  }

  // The "g" method returns the next (count) outputs as one number.
  (me.g = function(count) {
    // Using instance members instead of closure state nearly doubles speed.
    var t, r = 0,
        i = me.i, j = me.j, s = me.S;
    while (count--) {
      t = s[i = mask & (i + 1)];
      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
    }
    me.i = i; me.j = j;
    return r;
    // For robust unpredictability, the function call below automatically
    // discards an initial batch of values.  This is called RC4-drop[256].
    // See http://google.com/search?q=rsa+fluhrer+response&btnI
  })(width);
}

//
// copy()
// Copies internal state of ARC4 to or from a plain object.
//
function copy(f, t) {
  t.i = f.i;
  t.j = f.j;
  t.S = f.S.slice();
  return t;
};

//
// flatten()
// Converts an object tree to nested arrays of strings.
//
function flatten(obj, depth) {
  var result = [], typ = (typeof obj), prop;
  if (depth && typ == 'object') {
    for (prop in obj) {
      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
    }
  }
  return (result.length ? result : typ == 'string' ? obj : obj + '\0');
}

//
// mixkey()
// Mixes a string seed into a key that is an array of integers, and
// returns a shortened string seed that is equivalent to the result key.
//
function mixkey(seed, key) {
  var stringseed = seed + '', smear, j = 0;
  while (j < stringseed.length) {
    key[mask & j] =
      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
  }
  return tostring(key);
}

//
// autoseed()
// Returns an object for autoseeding, using window.crypto and Node crypto
// module if available.
//
function autoseed() {
  try {
    var out;
    if (nodecrypto && (out = nodecrypto.randomBytes)) {
      // The use of 'out' to remember randomBytes makes tight minified code.
      out = out(width);
    } else {
      out = new Uint8Array(width);
      (global.crypto || global.msCrypto).getRandomValues(out);
    }
    return tostring(out);
  } catch (e) {
    var browser = global.navigator,
        plugins = browser && browser.plugins;
    return [+new Date, global, plugins, global.screen, tostring(pool)];
  }
}

//
// tostring()
// Converts an array of charcodes to a string
//
function tostring(a) {
  return String.fromCharCode.apply(0, a);
}

//
// When seedrandom.js is loaded, we immediately mix a few bits
// from the built-in RNG into the entropy pool.  Because we do
// not want to interfere with deterministic PRNG state later,
// seedrandom will not call math.random on its own again after
// initialization.
//
mixkey(math.random(), pool);

//
// Nodejs and AMD support: export the implementation as a module using
// either convention.
//
if ((typeof module) == 'object' && module.exports) {
  module.exports = seedrandom;
  // When in node.js, try using crypto package for autoseeding.
  try {
    nodecrypto = require('crypto');
  } catch (ex) {}
} else if ((typeof define) == 'function' && define.amd) {
  define(function() { return seedrandom; });
} else {
  // When included as a plain script, set up Math.seedrandom global.
  math['seed' + rngname] = seedrandom;
}


// End anonymous scope, and pass initial values.
})(
  // global: `self` in browsers (including strict mode and web workers),
  // otherwise `this` in Node and other environments
  (typeof self !== 'undefined') ? self : this,
  [],     // pool: entropy pool starts empty
  Math    // math: package containing random, pow, and seedrandom
);

},{"crypto":3}]},{},[2]);
