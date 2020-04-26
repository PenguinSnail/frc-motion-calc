// Fetch motionworks data from The Blue Alliance for a specified team/event
// Noah Piraino <noahapiraino@gmail.com> - April 25, 2020

// Imports ----------------------------

const https = require('https');
const fs = require('fs');

// Temporary Data ---------------------

let finalData = [];

// Functions --------------------------

/**
 * Get the match keys for a specified team at a specified event
 * @param {number} _team Team number
 * @param {string} _event Event key
 * @param {string} _tbaKey TBA API Key
 */
const getMatches = (_team, _event, _tbaKey) => new Promise((resolve, reject) => {
	// build the API endpoint
	const url = `https://www.thebluealliance.com/api/v3/team/frc${_team}/event/${_event}/matches/keys`;

	// create a hew get request to the url, passing the api key as a header
	const req = https.get(url, { headers: { 'X-TBA-Auth-Key': _tbaKey } }, res => {
		// initialize the response object
		let body = '';
	
		// set the encoding
		res.setEncoding('utf8');
		// set a data handler
		res.on('data', data => {
			// append data to the body object
			body += data;
		});
		// set a response end handler
		res.on('end', () => {
			// if we didn't get a 200 code, reject
			if (res.statusCode !== 200) {
				reject(`Status code: ${res.statusCode}`);
			} else {
				// else try parsing the body data, then resolve it
				try {
					body = JSON.parse(body);
					resolve(body);
				} catch (e) {
					console.error('error parsing match keys for team ' + _team + ' at event ' + _event, e);
					reject(e);
				}
			}
		});
	});
	// error handlers
	req.on('error', e => {
		console.error('error getting match keys for team ' + _team + ' at event ' + _event, e);
		reject(e);
	});
	req.on('timeout', e => {
		console.error('error getting match keys for team ' + _team + ' at event ' + _event, e);
		req.abort();
		reject(e);
	});
	req.on('uncaughtException', e => {
		console.error('error getting match keys for team ' + _team + ' at event ' + _event, e);
		req.abort();
		reject(e);
	});
});

/**
 * Get the motionworks data for a specific team in a match
 * @param {number} _team Team number
 * @param {string} _matchKey Match key
 * @param {string} _tbaKey TBA API Key
 */
const getMotionworks = (_team, _matchKey, _tbaKey) => new Promise((resolve, reject) => {
	// build the api endpoint
	const url = `https://www.thebluealliance.com/api/v3/match/${_matchKey}/zebra_motionworks`;

	// create a new get request to the url with the api key in headers
	const req = https.get(url, { headers: { 'X-TBA-Auth-Key': _tbaKey } }, res => {
		// initialize the body object
		let body = '';
	
		// set the encoding
		res.setEncoding('utf8');
		// set a data handler
		res.on('data', data => {
			// append new datat to the body object
			body += data;
		});
		// when the request ends
		res.on('end', () => {
			if (res.statusCode !== 200 && res.statusCode !== 404) {
				// if we don't get a 200 or 404, reject
				// 404 shouldn't cause everything to fail because it's expected for some matches to not have motion data
				reject(`Status code: ${res.statusCode}`);
			} else {
				try {
					// parse the body data
					body = JSON.parse(body);
					// if there's no valid body resolve null
					if (!body) {
						resolve(null);
					} else {
						// else locate the data for just the specified team
						// this is done by filtering each alliance just to the specified team number,
						// and spreading them both into a new array
						const teamData = [
							...body.alliances.red.filter(element => element.team_key === `frc${_team}`),
							...body.alliances.blue.filter(element => element.team_key === `frc${_team}`)
						];
						// use the timestamps as a base, and map the x/y data for the robot into a new array
						const data = body.times.map((timestamp, i) => ({
							time: timestamp,
							x: teamData[0].xs[i],
							y: teamData[0].ys[i]
						}));
						// resolve the newly mapped data
						resolve(data);
					}
				} catch (e) {
					console.error('error parsing motionworks data for match ' + _matchKey, e);
					reject(e);
				}
			}
		});
	});
	// error handlers
	req.on('error', e => {
		console.error('error getting motionworks data for match ' + _matchKey, e);
		reject(e);
	});
	req.on('timeout', e => {
		console.error('error getting motionworks data for match ' + _matchKey, e);
		req.abort();
		reject(e);
	});
	req.on('uncaughtException', e => {
		console.error('error getting motionworks data for match ' + _matchKey, e);
		req.abort();
		reject(e);
	});
});

// Main -------------------------------

/**
 * Fetch motionworks data from The Blue Alliance for a specified team/event
 * @param {number} team The team number
 * @param {string} event The event key
 * @param {string} tbakey The TBA API Key
 */
module.exports = (team, event, tbakey) => new Promise((resolve, reject) => {
	// get a list of the teams match keys
	getMatches(team, event, tbakey).then(keys => {
		// for each key
		keys.forEach(matchKey => {
			// get the motionworks data for that match
			getMotionworks(team, matchKey, tbakey).then(motionData => {
				// then append it to our final datat array
				finalData.push({
					match: matchKey,
					team: team,
					points: motionData
				});
				// if this was the last match to be fetched
				if (keys.length === finalData.length) {
					// resolve the data, filtering out any matches without point data
					resolve(finalData.filter(el => el.points !== null));
				}
			}, e => {
				console.error(`ERROR: Get matches: ${e}`);
				reject(e);
			});
		});
	}, e => {
		console.error(`ERROR: Get keys: ${e}`);
		reject(e);
	});
});
