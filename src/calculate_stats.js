// Creates line plots and numerical stats of speed and acceleration
// from motionworks data (one team per match, unlimited matches)
// Noah Piraino <noahapiraino@gmail.com> - April 26, 2020

// Imports ----------------------------

const fs = require('fs');
const vega = require('vega');

// Chart Configuration ----------------

const chartConf = {
	$schema: "https://vega.github.io/schema/vega/v5.json",
	description: "A speed/acceleration line plot",
	width: 10000,
	height: 500,
	padding: 5,
	data: [
		{
			name: "data",
			values: []
		}
	],
	scales: [
		{
			name: "x",
			type: "point",
			range: "width",
			domain: {
				data: "data",
				field: "x"
			}
		},
		{
			name: "y",
			type: "linear",
			range: "height",
			nice: true,
			zero: true,
			domain: {
				data: "data",
				field: "y"
			}
		},
		{
			name: "color",
			type: "ordinal",
			range: "category",
			domain: {
				data: "data",
				field: "c"
			}
		}
	],
	axes: [
		{
			orient: "bottom",
			scale: "x",
			labelOverlap: "greedy"
		},
		{
			orient: "left",
			scale: "y",
			grid: true,
			domain: false,
			tickSize: 12,
			encode: {
				grid: {
					enter: {
						stroke: {
							value: "#ccc"
						}
					}
				},
				ticks: {
					enter: {
						stroke: {
							value: "#ccc"
						}
					}
				}
			}
		}
	],
	marks: [
		{
			type: "group",
			from: {
				facet: {
					name: "series",
					data: "data",
					groupby: "c"
				}
			},
			marks: [
				{
					type: "line",
					from: {
						data: "series"
					},
					encode: {
						enter: {
							x: {
								scale: "x",
								field: "x"
							},
							y: {
								scale: "y",
								field: "y"
							},
							stroke: {
								scale: "color",
								field: "c"
							},
							strokeWidth: {
								value: 2
							}
						}
					}
				}
			]
		}
	]
};

// Temporary Data ---------------------

let stats = {
	individual_matches: []
};

// Functions --------------------------

/**
 * Return an array of distances with timestamps and durations calculated from an array of points with timestamps
 * @param {[]} _points An array of x/y points with timestamps
 * @returns {[]} An array of distances with timestamps and duration
 */
const calculateDistances = _points => {
	// map out the points including the index
	return _points.map((point, i) => {
		// check to ensure the current and next points are defined
		if (point && _points[i + 1]) {
			// set the current and next points
			const p1 = point;
			const p2 = _points[i + 1];

			// calculate distance using the distance formula (for our use it should be in feet)
			const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
			// calculate time from the point timestamps (this should be in seconds)
			const time = p2.time - p1.time;

			// return a distance object, which will be mapped into our new array
			return {
				timestamp: p1.time,
				time: Math.round(time * 10)/10,
				distance: distance
			};
		} else {
			// else if the current and next points aren't defined just return
			return;
		}
		// the filter will remove any undefined items from our final array
	}).filter(Boolean);
};

/**
 * Return an array of speeds with timestamps calculated from an array of distances with timestamps and durations
 * @param {[]} _distances An array of distances with timestamps and durations
 * @returns {[]} An array of speeds with timestamps
 */
const calculateSpeeds = _distances => {
	// map our distances including index
	return _distances.map((dist, i) => {
		// check to ensure the current distance item and the next are both defined
		if (dist && _distances[i + 1]) {
			// calculate speed in feet per second
			const speed = dist.distance / dist.time;
			// return the speed object into the newly mapped array
			return {
				timestamp: dist.timestamp,
				speed: Math.round(speed * 100)/100
			};
		} else {
			// else if they're not both defined, just return
			return;
		}
		// filter out any undefined items
	}).filter(Boolean);
};

/**
 * Return an array of accelerations with timestamps and durations calculated from an array of speeds with timestamps
 * @param {[]} _speeds An array of speeds with timestamps
 * @returns {[]} An array of accelerations with timestamps and durations
 */
const calculateAccelerations = _speeds => {
	// map the speed points
	return _speeds.map((speed, i) => {
		// ensure the points exist
		if (speed && _speeds[i + 1]) {
			// set the points
			const s1 = speed;
			const s2 = _speeds[i + 1];

			// calculate acceleration (should be in feet per second per second)
			const acceleration = s2.speed - s1.speed;
			const time = s2.timestamp - s1.timestamp;

			// return the item
			return {
				timestamp: s1.timestamp,
				time: Math.round(time * 10)/10,
				acceleration: Math.round(acceleration * 100)/100
			};
		} else {
			return;
		}
		// filter undefined/null
	}).filter(Boolean);
};

// Main -------------------------------

/**
 * Creates line plots and numerical stats of speed and acceleration from motionworks data
 */
module.exports = (data) => {
	data.forEach(match => {
		// filter out any incomplete position data
		const filteredPoints = match.points.filter(point => point.x !== null && point.y !== null);

		// calculate distance, speed, and acceleration
		const distances = calculateDistances(filteredPoints);
		const speeds = calculateSpeeds(distances);
		const accelerations = calculateAccelerations(speeds);

		// fill in our stats array
		stats.individual_matches.push({
			match: match.match,
			team: match.team,
			// find the max speed value
			maxSpeed_fps: Math.max(...speeds.map(s => s.speed)),
			// calculate average speed
			avgSpeed_fps: Math.round(speeds.map(s => s.speed).reduce((a, b) => a + b)/speeds.length*100)/100,
			// find max acceleration
			maxAccel_fpsps: Math.max(...accelerations.map(a => a.acceleration)),
			// find minimum acceleration (braking)
			maxBrake_fpsps: Math.min(...accelerations.map(a => a.acceleration))
		});

		// create a temporary chart configuration from the main one defined above
		let chart = { ...chartConf };

		// map our speed and acceleration datat to a format the chart library can use
		const speedData = speeds.map(s => ({
			x: s.timestamp,
			y: s.speed,
			c: 0
		}));
		const AccelData = accelerations.map(a => ({
			x: a.timestamp,
			y: a.acceleration,
			c: 1
		}));

		// load the data into the chart config
		chart.data[0].values = [...speedData, ...AccelData, ];

		// generate the chart...
		const view = new vega.View(vega.parse(chart), {renderer: 'none'});
		// ...and render the chart to an svg string
		view.toSVG().then(svg => {
			// write the svg to a file
			fs.writeFileSync(`${match.match}_${match.team}.svg`, svg);
		}, e => {
			console.error(e);
		});
	});

	// calculate global speed data
	stats.maxSpeed_fps = Math.max(...stats.individual_matches.map(m => m.maxSpeed_fps));
	stats.avgMaxSpeed_fps = stats.individual_matches.map(m => m.maxSpeed_fps).reduce((a, b) => a + b)/stats.individual_matches.length;
	stats.avgSpeed_fps = stats.individual_matches.map(m => m.avgSpeed_fps).reduce((a, b) => a + b)/stats.individual_matches.length;
	// calculate global acceleration data
	stats.maxAccel_fpsps = Math.max(...stats.individual_matches.map(m => m.maxAccel_fpsps));
	stats.avgMaxAccel_fpsps = stats.individual_matches.map(m => m.maxAccel_fpsps).reduce((a, b) => a + b)/stats.individual_matches.length;
	// calculate global "braking" data
	stats.maxBrake_fpsps = Math.min(...stats.individual_matches.map(m => m.maxBrake_fpsps));
	stats.avgMaxBrake_fpsps = stats.individual_matches.map(m => m.maxBrake_fpsps).reduce((a, b) => a + b)/stats.individual_matches.length;

	// write numeric stats to a file
	fs.writeFileSync('./stats.json', JSON.stringify(stats));
}
