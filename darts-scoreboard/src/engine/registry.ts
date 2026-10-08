// Central registry: every game's engine + how-to-play content lives here.

import type { GameId, GameType, Guide } from './core'
import type { GameDef } from './core'
import { x01Def } from './games/x01'
import { cricketDef } from './games/cricket'
import { killerDef } from './games/killer'
import { saKillerDef } from './games/sa-killer'
import { scramDef, englishCricketDef, steeplechaseDef, followMeDef, bobs27Def, tttDef } from './games/extra'
import {
  atc180Def, footballDef, grandNationalDef, hareHoundsDef, blindKillerDef, knockoutDef,
  mickeyMouseDef, mulliganDef, prisonerDef, snookerDef, suddenDeathDef, followLeaderDef,
} from './games/extra2'
import {
  countUpDef, climbDef, bowlsDef, battleshipsDef, hoNoDef, indyDef, loopDef,
  slipupDef, shoveDef, warfareDef, tennisDef, scamDef, gotchaDef, quickfireDef,
} from './games/extra3'
import {
  atcDef,
  shanghaiDef,
  halveItDef,
  golfDef,
  baseballDef,
  highScoreDef,
  fivesDef,
  chaseDef,
  nineLivesDef,
  bermudaDef,
} from './games/more'

export type RegisteredGame = GameDef<any> & { guide: Guide }

const G = (def: GameDef<any>, guide: Guide): RegisteredGame => ({ ...def, guide })

export const GAMES: Record<GameId, RegisteredGame> = {
  x01: G(x01Def, {
    objective: 'Reduce your score from 501 (or 301/701/901) to exactly zero before your opponents. The final dart must land in a double (or the chosen finishing segment).',
    setup: [
      'Each player starts on the same score — 501 is the singles standard, 301 for quicker games.',
      'Choose how play begins: straight in (any dart counts) or double in.',
      'Choose how you finish: straight out, double out (tournament standard) or master out (double or bull).',
      'Decide legs: first to 1, 2, 3, 5 or 7 legs wins the match.',
    ],
    play: [
      'Players throw 3 darts per visit, alternating. Each dart is subtracted from your remaining score.',
      'A dart that takes you below zero, to exactly 1 (in double-out), or fails the finishing rule is a BUST: your score resets to the start of the visit and your turn ends immediately.',
      'The scoreboard shows every chalked visit and suggests checkouts (e.g. 170 = T20 T20 BULL).',
    ],
    winning: 'Reach exactly zero with a legal finishing dart. Win the agreed number of legs.',
    tips: [
      'Leave an even number with double out — 32 (D16) is the classic power leave.',
      'Throw T20 until in checkout range, then play the route.',
      'Never leave an odd number with double out.',
    ],
  }),
  cricket: G(cricketDef, {
    objective: 'Own the numbers 15–20 and the bull by scoring 3 marks on each, then point-farm on numbers your opponents have not closed.',
    setup: [
      'Targets: 15, 16, 17, 18, 19, 20 and the bull.',
      'Single = 1 mark, double = 2, treble = 3; outer bull = 1, inner bull (50) = 2.',
      'Close a number with 3 marks.',
    ],
    play: [
      '3 darts per visit, alternating.',
      'While a number is open for you, hits add marks.',
      'Once you own a number an opponent has not closed, extra hits score its value as points.',
      'Cut-Throat: points you score are penalties added to opponents — lowest total wins.',
    ],
    winning: 'Close all seven targets with equal or more points than everyone (fewest in Cut-Throat).',
    tips: ['Close 20 and 19 first.', 'Trebles close a number in one dart.', 'In Cut-Throat, block rather than farm when ahead.'],
  }),
  scram: G(scramDef, {
    objective: 'A two-phase duel: the Stopper hunts numbers off the board while the Scorer piles points onto whatever is still open. Then you swap — the better scoring phase wins.',
    setup: ['Two players only. The Stopper throws first in each phase.', 'All 20 numbers are in play; no bull.', 'A number is closed the moment the Stopper hits it — one dart of any kind.'],
    play: [
      'Stopper: 3 darts to kill numbers — a single hit of any kind closes that number for the phase.',
      'Scorer: 3 darts — every dart landing on an OPEN number scores full face value (doubles and trebles too). Darts on closed numbers score nothing.',
      'When all 20 are closed (or the round cap passes), roles swap and the board resets.',
    ],
    winning: 'Highest score from your Scoring phase. Both players stop and score exactly once.',
    tips: ['As Scorer, camp on 20 then 19 while they last.', 'As Stopper, kill 20 and 19 first — the Scorer lives on them.'],
  }),
  'english-cricket': G(englishCricketDef, {
    objective: 'The pub classic: the Batsman bats while the Bowler hunts wickets on the bull. Ten wickets end the innings, then swap — the second batsman must chase the first total.',
    setup: ['Player 1 bats first, Player 2 bowls.', 'Only your 3-dart HAND total matters: hands over 40 become runs (41 → 1 run, 65 → 25 runs, 40 or less → nothing).'],
    play: [
      'Batsman: each 3-dart hand scores hand total − 40 as runs (no runs for 40 or under).',
      'Bowler: each dart at the bull takes wickets — outer bull (25) takes 1, inner bull (50) takes 2.',
      'Every bowler dart that MISSES the bull gifts the batsman its face value in runs — it pays to just hit the board.',
      'Ten wickets end the innings; then the bowler bats and must overtake the first total.',
    ],
    winning: 'Innings 2 wins by passing the first total; level scores are a tie.',
    tips: ['Batsman: 20s build hands fast — but 3 × 20 = 60 banks 20 runs.', 'Bowler: outer bull is the safe wicket; a wild miss hands over runs.'],
  }),
  killer: G(killerDef, {
    objective: 'Become a killer, then eliminate every other player by hitting the segment allocated to them. Last player alive wins.',
    setup: [
      'Each player is allocated a number 1–20 (the app shows yours on your panel).',
      'House variant (from our Excel sheet): hit the DOUBLE of your own number to become a killer.',
      'Standard variant: a single of your number arms you.',
      'Each player starts with 3 lives.',
    ],
    play: [
      'Before arming: hit your own double (house) / single (standard).',
      'Armed: hit a DOUBLE of an opponent\u2019s number (house) / their number (standard) to take a life.',
      'Your own number does nothing while armed.',
      '0 lives = out; play skips the dead.',
    ],
    winning: 'Last player with a life.',
    tips: ['Take the first kill chance — pressure wins.', 'Finish one-life players before they arm.', 'Remember: only doubles kill in house rules.'],
  }),
  'sa-killer': G(saKillerDef, {
    objective: 'The Web-Slabs house game (from the KILLER (NEW) scorebook): get 3 X\u2019s on a channel to open it, then score through it \u2014 but if both players open the same channel it goes DEAD for everyone.',
    setup: [
      'One shared spine: numbers 20 \u2192 10 plus the D (double), T (treble) and B (bull) channels.',
      'Singles feed the number channel of that row; ANY double feeds your D channel; ANY treble your T channel; any bull your B channel.',
      'Play 3 darts each in rotation. Optional starters (off by default): bull-off, opening shot, close shot, points target.',
    ],
    play: [
      'Chalk an X each time a dart feeds one of your channels \u2014 tap the box or throw via the board/pad.',
      '3 X\u2019s = the channel is OPEN and scores for you: a single on an open number pays N, a double through an open D channel pays 2N, a treble through an open T channel pays 3N, a bull pays 25.',
      'If BOTH players have 3 X\u2019s on the same channel it is CLOSED \u2014 struck through in red, nobody scores through it.',
      'Channels are independent: dead 20s never block an open T channel \u2014 T20 still pays 60.',
      'With no target set, end the game when you agree and the higher total wins.',
    ],
    winning: 'Highest total when the game ends \u2014 or first to the points target / close shot if those options are on.',
    tips: [
      'Opening a channel the opponent already opened kills it \u2014 sometimes the best dart is the one you don\u2019t mark.',
      'The D and T channels pay double and treble on ANY row \u2014 T20 through an open Trip channel is 60 a dart.',
      'Protect your lead: closing a channel you are scoring through stops their points too \u2014 but stops yours as well.',
    ],
  }),
  'around-the-clock': G(atcDef, {
    objective: 'Be first to hit every number 1 through 20 in strict order.',
    setup: ['Segment rule: any part (default), doubles only, or trebles only.', '3 darts per turn.'],
    play: ['Hit 1 before 2, 2 before 3 … up to 20.', 'Any dart on your current target advances you.', 'Everything else is a no-score.'],
    winning: 'Hit 20 first.',
    tips: ['Big segments (20, 5, 12) are kindest.', 'Doubles/trebles mode is the X01 finishing drill in disguise.'],
  }),
  shanghai: G(shanghaiDef, {
    objective: 'Score maximum points over 7 rounds — or win instantly with a Shanghai (single + double + treble of the round number in one visit).',
    setup: ['Round 1 targets 1 … round 7 targets 7.', '3 darts per round.'],
    play: [
      'Only darts on the round number score (S/D/T = 1×/2×/3× face value).',
      'A Shanghai in one visit wins immediately.',
      'Highest total after round 7 otherwise wins.',
    ],
    winning: 'Highest score after 7 rounds — or an instant Shanghai.',
    tips: ['Round 7 decides most games: T7 is tiny, stay calm.', 'Every visit is worth attacking for the treble.'],
  }),
  'chase-the-dragon': G(chaseDef, {
    objective: 'Hit trebles 10 through 20 in order, then the bull — pure treble practice as a race.',
    setup: ['Order: T10, T11 … T20, then inner bull.', '3 darts per turn.'],
    play: ['Hit the current target to advance.', 'First to complete all 12 targets wins.'],
    winning: 'First to finish the sequence.',
    tips: ['T10–T14 are big — bank progress early.', 'The best X01 treble practice there is.'],
  }),
  'bermuda-triangle': G(bermudaDef, {
    objective: 'Escape the triangle: 12 → 20 in order, with any-double and any-treble wildcards, finishing on the bull.',
    setup: ['Path: 12, 13, 14, any double, 15, 16, 17, any treble, 18, 19, 20, bull.', '3 darts per turn.'],
    play: ['Hit the current step to advance.', 'Wildcards let you use favourite numbers.', 'First to the final bull escapes.'],
    winning: 'First to complete all 12 steps.',
    tips: ['D20/T20 are the classic wildcard choices.', 'The closing bull needs cool nerves.'],
  }),
  'nine-lives': G(nineLivesDef, {
    objective: 'Around the Clock with a safety net: 9 lives; miss your target in a visit and you lose one.',
    setup: ['Order: 1 → 20.', '3 darts per turn, 9 lives each.'],
    play: ['Hit your current number to advance; a fruitless visit costs a life.', '0 lives = eliminated.'],
    winning: 'Finish 1→20 first or outlast everyone.',
    tips: ['Careful targeting beats rushing.', 'Play safe on wide segments when ahead.'],
  }),
  steeplechase: G(steeplechaseDef, {
    objective: 'A horse race around the board: clear all 20 hurdles — the segments in clockwise order from 20 — before anyone else.',
    setup: ['Hurdle order: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5.', 'Any part of the segment clears the hurdle.'],
    play: ['3 darts per turn.', 'Hit the current hurdle to advance.', 'The low numbers (3, 4, 5) lose races.'],
    winning: 'First to clear hurdle 20 (segment 5).',
    tips: ['Learn the board order — muscle memory wins.', '11, 14, 9, 12, 5 cluster late: stay calm.'],
  }),
  'follow-me': G(followMeDef, {
    objective: 'Hit the current target to pass the baton — the next number up becomes the target. Miss with a whole visit and you lose a life.',
    setup: ['Start at 20.', 'Any hit on the target counts.'],
    play: ['3 darts per visit.', 'A hit advances the target by one (20 wraps to 1).', 'A visit with no target hit costs a life; 3 lives each.'],
    winning: 'Outlast the other players.',
    tips: ['The 20→1 wrap catches people out.', 'Wide segments are your friends.'],
  }),
  'halve-it': G(halveItDef, {
    objective: 'Survive 12 rounds of precision. Hit the round\u2019s target — miss with all 3 darts and your score is halved (eliminated at zero).',
    setup: ['Targets in order: 20, 16, D16, T16, 17, D17, T19, 18, Bull, 19, T20, Bull(50).', 'Everyone starts at 0; 3 darts per round.'],
    play: ['Every dart on target adds its value.', 'End a round with zero hits: score halved (rounded up). Zero when halved = out.', 'Highest after 12 rounds wins.'],
    winning: 'Highest total among survivors.',
    tips: ['The bull rounds make or break you.', 'A big lead evaporates with one halved round.'],
  }),
  'high-score': G(highScoreDef, {
    objective: 'Pure points: highest total after the agreed rounds.',
    setup: ['Pick 4, 8 or 10 rounds.', '3 darts per round at anything.'],
    play: ['Every dart scores face value.', 'No busts, no targets — just aggression.'],
    winning: 'Highest total when rounds run out.',
    tips: ['Always throw T20.', 'Great for measuring raw scoring form.'],
  }),
  fives: G(fivesDef, {
    objective: 'The counting classic: a visit only counts when its 3-dart total divides evenly by 5, and you then score that many FIVES (total ÷ 5). Race to exactly 51.',
    setup: ['Agree the target: 51 (classic), or 61–91 for longer games.', '3 darts per visit.', 'Every visit either banks fives or banks nothing.'],
    play: [
      'Throw 3 darts; add the face values. 10 + 10 + 5 = 25 → 5 fives.',
      'If the total is not divisible by 5, the visit scores nothing.',
      'Reaching the target EXACTLY wins. Going over is a bust: your score reverts to what it was before the visit.',
    ],
    winning: 'First player to land exactly on the target number of fives.',
    tips: ['Anchor finishes on 5, 10, 15 and 20 — they combine into almost any multiple of 5.', 'Counting discipline beats power.'],
  }),
  'bobs-27': G(bobs27Def, {
    objective: 'The legendary doubles drill: start on 27, throw 3 darts at D20 — hit one and add 40, miss all and subtract 40. Work down to D1 without busting out.',
    setup: ['Everyone starts on 27 points, target D20.', '3 darts per target.'],
    play: [
      'Each double hit adds target × 2 to your score.',
      'A visit with zero doubles subtracts target × 2.',
      'After the D20 visit, move to D19, D18 … D1.',
      'Score of zero or below = elimination.',
    ],
    winning: 'Highest surviving score after D1 (or last player standing).',
    tips: ['20 minutes of Bobs beats an hour of random throwing.', 'Keep throwing: two hits usually beat one miss.'],
  }),
  'tic-tac-toe': G(tttDef, {
    objective: 'Darts noughts-and-crosses: each square is a number; hit it twice to claim; three in a row wins.',
    setup: ['Grid maps to: 20, 3, 17 / 16, 19, 18 / 7, 13, 11.', 'Two hits claim a square (hits accumulate).'],
    play: ['3 darts per turn.', 'Hits on unclaimed numbers count toward claiming.', 'Owned squares are dead.'],
    winning: 'Three claimed squares in a row.',
    tips: ['Center square (19) is the tactical prize.', 'Block opponents\u2019 two-in-a-line threats.'],
  }),
  golf: G(golfDef, {
    objective: 'Play 18 holes (or 9) in as few strokes as possible.',
    setup: ['Hole N = segment N.', '3 darts per hole.'],
    play: ['Treble = 1 stroke (ace!), double = 2, single = 3, anything else = 4.', 'Strokes accumulate across holes.'],
    winning: 'Lowest total strokes.',
    tips: ['The treble is a full stroke better — always chase it.', 'On tiny trebles, secure the single.'],
  }),
  baseball: G(baseballDef, {
    objective: 'Score the most runs over 9 innings.',
    setup: ['Inning N = segment N.', '3 darts per player per inning.'],
    play: ['Single = 1 run, double = 2, treble = 3 of the inning number.', 'Anything else is a strike; play through the innings.'],
    winning: 'Most runs after 9 innings.',
    tips: ['Innings 5 and 6 have wide segments — cash in.', 'With 2 strikes, settle for the single.'],
  }),
  'around-the-clock-180': G(atc180Def, {
    objective: 'Accuracy benchmark: throw 3 darts at each number 1→20; singles score 1, trebles 3 (doubles just 1). Perfect game = 180.',
    setup: ['Everyone throws at the same number each round.'],
    play: ['Hits on the current number score (T=3, S/D=1).', 'Number advances after the round.'],
    winning: 'Highest total after 20 numbers.',
    tips: ['60+ = solid pub player, 100+ = county class.', 'Doubles score 1 here — chase trebles only.'],
  }),
  football: G(footballDef, {
    objective: 'Hit the bull to kick off, then score goals with any double — first to 10 goals wins the match.',
    setup: ['Everyone starts needing the kick-off bull.'],
    play: ['Bull = kick-off, then every double (incl. bull) is a goal.', 'First to 10 goals.'],
    winning: 'First to 10 goals.',
    tips: ['D20 is the biggest double on the board.'],
  }),
  'grand-national': G(grandNationalDef, {
    objective: 'Race the board ANTICLOCKWISE from 20 — miss the hurdle segment with all 3 darts and you fall and are out.',
    setup: ['Hurdles run anticlockwise from 20.'],
    play: ['Any part of the segment clears the hurdle.', 'A fruitless visit = fall = eliminated.'],
    winning: 'First to clear all 20 hurdles.',
    tips: ['The low numbers late in the race decide everything.'],
  }),
  'hare-and-hounds': G(hareHoundsDef, {
    objective: 'A chase: the hare runs clockwise from 20 back to 20; the hound starts at 5 and must catch up before the escape.',
    setup: ['Player 1 = hare, Player 2 = hound.'],
    play: ['Hit your current segment to advance.', 'Hare completes the loop to win; hound catches up to win.'],
    winning: 'Escape or catch.',
    tips: ['Steady singles from the hound beat risky trebles.'],
  }),
  'blind-killer': G(blindKillerDef, {
    objective: 'Nobody knows their number: hit any double three times to reveal it, then eliminate that number\u2019s owner with its double. Last survivor wins.',
    setup: ['Secret numbers dealt randomly, 3 lives each.'],
    play: ['Unrevealed: any double = a reveal mark (need 3).', 'Revealed: your number\u2019s double takes a victim\u2019s life.'],
    winning: 'Last player alive.',
    tips: ['Listen to the reveals — knowledge is the weapon.'],
  }),
  knockout: G(knockoutDef, {
    objective: 'The first player sets a 3-dart score; everyone after must beat it. Fail and lose a life (3 each).',
    setup: ['3 lives each.'],
    play: ['Any score counts — beat the bar or die.', 'Each success raises the bar.'],
    winning: 'Last player with a life.',
    tips: ['Modest scores keep you alive — the bar climbs on its own.'],
  }),
  'mickey-mouse': G(mickeyMouseDef, {
    objective: 'Cricket without points: close 20, 19, 18 … down to 12, then bull — strictly in order. First to close everything wins.',
    setup: ['Targets: 20→12 + bull, in order.'],
    play: ['Only the current segment counts.', 'Everyone plays each segment before moving on.'],
    winning: 'First to close all 10 targets.',
    tips: ['T20 closes a round in one dart.'],
  }),
  mulligan: G(mulliganDef, {
    objective: 'Mickey Mouse with dice: six random numbers (plus bull) closed in order — trebles leap three stages at once.',
    setup: ['Six numbers drawn at random.'],
    play: ['Only your current stage\u2019s number counts.', 'A treble skips three stages.'],
    winning: 'First to close the bull.',
    tips: ['Trebles are everything — 3 stages in one dart.'],
  }),
  prisoner: G(prisonerDef, {
    objective: 'Escape by hitting 1→20 in order; your stray darts stay stranded on the board as prisoners for rivals to capture.',
    setup: ['Everyone starts on 1.'],
    play: ['Hit your current number to advance.', 'Misses become prisoners; hitting a number captures whoever\u2019s dart is stranded there.'],
    winning: 'First player past 20.',
    tips: ['Keep your darts on YOUR number.'],
  }),
  snooker: G(snookerDef, {
    objective: 'Snooker on the board: pot a red (1-15, 1 pt) then a colour in order — Yellow 16, Green 17, Brown 18, Blue 19, Pink 20, Black/bull (7) — race to 147.',
    setup: ['Sequence: red → colour → red…'],
    play: ['Reds: any of 1-15 scores 1.', 'Colours must be potted in strict order; a miss passes the turn.'],
    winning: 'First to 147 — a maximum!',
    tips: ['The bull as black is the killer pot.'],
  }),
  'sudden-death': G(suddenDeathDef, {
    objective: 'A number is called each round; hit it during your visit or be eliminated. Last player standing wins.',
    setup: ['A random number is called every round.'],
    play: ['Any part of the called number saves you.', 'Miss the call with all 3 darts = out.'],
    winning: 'Be the last survivor.',
    tips: ['Small numbers are the graveyard — practise them.'],
  }),
  'follow-the-leader': G(followLeaderDef, {
    objective: 'Match the EXACT segment the leader sets (e.g. small single 12) with your 3 darts or lose a life; your remaining darts set the next target.',
    setup: ['3 lives each; first dart sets the opening target.'],
    play: ['Exact segment match to pass the buck.', 'Leaders choose doubles/trebles to torture the table.'],
    winning: 'Last player with a life.',
    tips: ['D14 and T17 are executioner\u2019s choices.'],
  }),
  'count-up': G(countUpDef, {
    objective: 'The purest race: first to 300/500/1000 points, anything scores.',
    setup: ['Agree the target.'],
    play: ['Every dart scores face value.', 'No busts, no rules.'],
    winning: 'First past the target.',
    tips: ['The best game for teaching someone to keep score.'],
  }),
  climb: G(climbDef, {
    objective: 'Climb to exactly 301 — overshoot and you fall all the way back to zero.',
    setup: ['Target: exactly 301.'],
    play: ['Add dart values to your height.', 'Over 301 = bust = back to 0.'],
    winning: 'Land on exactly 301.',
    tips: ['Count backwards like 501 — know your outs.'],
  }),
  bowls: G(bowlsDef, {
    objective: 'Lawn bowls on the board: the first dart sets the jack; nearest dart each end scores. First to 10 ends wins.',
    setup: ['First dart of each end sets the jack.'],
    play: ['Match the jack\u2019s exact value and segment.', 'Nearest dart after everyone has thrown takes the end.'],
    winning: 'First to 10 ends.',
    tips: ['Touch beats power.'],
  }),
  battleships: G(battleshipsDef, {
    objective: 'Deploy a 5-ship fleet with your darts, then sink the enemy fleet — 5 hits wins.',
    setup: ['Deploy phase: your first 5 distinct segment hits become your fleet.'],
    play: ['Shots on enemy cells sink ships.'],
    winning: 'Sink all 5 enemy ships.',
    tips: ['Spread your fleet; memorise their deployment darts.'],
  }),
  'ho-no': G(hoNoDef, {
    objective: 'Count-up race to 301 — but an inner bull sends the NEXT thrower\u2019s score to zero. Ho no!',
    setup: ['Target 301.'],
    play: ['Score normally; a 50 zeroes the following player.'],
    winning: 'First to 301.',
    tips: ['Time your bulls for maximum cruelty.'],
  }),
  'indy-500': G(indyDef, {
    objective: 'Race to 500 miles: dart value = miles, but a single 3 forces a pit stop (lost dart).',
    setup: ['Race distance: 500 points.'],
    play: ['Dart value = miles.', 'Single 3 = pit stop.'],
    winning: 'First to 500.',
    tips: ['The 20s are the racing line.'],
  }),
  loop: G(loopDef, {
    objective: 'Hit every wire-loop number — 20, 4, 6, 8, 9, 10, 14, 16, 18, 19 — at least once.',
    setup: ['Ten target numbers.'],
    play: ['Any segment of a loop number counts.'],
    winning: 'First to tick off all 10.',
    tips: ['4, 6, 8 live in the cold zone — most misses land there.'],
  }),
  'slip-up': G(slipupDef, {
    objective: 'Around the Clock with no safety net: a visit with zero hits sends you back to 1.',
    setup: ['Start at 1.'],
    play: ['Any hit advances one number.', 'A barren visit = slip back to 1.'],
    winning: 'Reach 20 first.',
    tips: ['Nothing is safe until 20 falls.'],
  }),
  'shove-hapenny': G(shoveDef, {
    objective: "The pub classic in darts form: land 3 hits in each bed — 20 down to 12.",
    setup: ['Beds: 20→12.'],
    play: ['Every dart in a bed counts toward its 3.'],
    winning: 'Close all 9 beds.',
    tips: ['Volume beats precision — singles score the same.'],
  }),
  warfare: G(warfareDef, {
    objective: 'Command 10 soldiers: singles kill 1, doubles 2, trebles 3. Wipe out every other army.',
    setup: ['10 soldiers each.'],
    play: ['Damage hits the next living opponent.'],
    winning: 'Last army standing.',
    tips: ['A hidden 501 drill — scoring power IS firepower.'],
  }),
  tennis: G(tennisDef, {
    objective: 'Tennis scoring: T15/bull = 2 points, single 15 = 1. Four points wins a game (0-15-30-40-game); first to 6 games takes the set.',
    setup: ['Two players; 15 and the bull are the court.'],
    play: ['T15 or bull = 2; single 15 = 1.', '4 points = a game; 6 games = the set.'],
    winning: 'First to 6 games.',
    tips: ['T15 is the money shot.'],
  }),
  scam: G(scamDef, {
    objective: 'The Stopper locks 20 numbers while the Scorer farms points on what remains — then swap and beat their score.',
    setup: ['Player 1 stops first.'],
    play: ['Stopper: block 20, 19, 18 first.', 'Scorer: farm fast before the board dies.'],
    winning: 'Highest score across your scoring phase.',
    tips: ['60s before the 20s die.'],
  }),
  gotcha: G(gotchaDef, {
    objective: 'Count-up race to 301 with betrayal: land your total exactly on a prime and steal 25 from the leader.',
    setup: ['Target 301; primes are ambushes.'],
    play: ['Know your primes — 271 from 299 is a dagger.'],
    winning: 'First to 301.',
    tips: ['Primes become second nature fast.'],
  }),
  quickfire: G(quickfireDef, {
    objective: 'Beat the clock: 60 seconds, 15 odd-number hits. Misses and evens burn 5 seconds; every dart costs 2.',
    setup: ['60-second clock, target 15 odd hits.'],
    play: ['Odd hit = progress.', 'Miss/even = −5s; each dart = −2s.'],
    winning: '15 odd hits before the clock dies.',
    tips: ['11, 15, 9 are the big odd targets.'],
  }),
}

export const GAME_LIST: RegisteredGame[] = Object.values(GAMES)

/** Games grouped by type, in display order. */
export function gamesByType(): { type: GameType; games: RegisteredGame[] }[] {
  const order: GameType[] = ['x01', 'cricket-family', 'killer-family', 'race', 'practice', 'sports']
  return order
    .map((type) => ({ type, games: GAME_LIST.filter((g) => g.type === type) }))
    .filter((g) => g.games.length > 0)
}

export const getGame = (id: GameId): RegisteredGame => GAMES[id]
