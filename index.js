// Creates line plots and numerical stats of speed and acceleration from motionworks data
// Team number, event key, and TBA API key are passed as command line arguments
// Noah Piraino <noahapiraino@gmail.com> - April 26, 2020

// Imports ----------------------------

const get = require('./src/get_data');
const calculate = require('./src/calculate_stats');

// CLI Options ------------------------

const argv = require('yargs')
.scriptName("frc-motion-calc")
.usage('$0 [args]')
.option('t', {
	alias: 'team',
	demandOption: true,
	type: 'number',
	description: 'Team number'
})
.option('e', {
	alias: 'event',
	demandOption: true,
	type: 'string',
	description: 'Event key'
})
.option('k', {
	alias: 'key',
	demandOption: true,
	type: 'string',
	description: 'TBA API key'
})
.argv;

// Main -------------------------------

// get the motionworks data
get(argv.team, argv.event, argv.key).then(data => {
	// then run the calculations and plotting
	calculate(data);
}, e => {
	console.error(`ERROR: Main: ${e}`);
});
