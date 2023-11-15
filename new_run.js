/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-inner-declarations */

function interpolate(template, variables) {
	return template.replace(/\${[^{]+}/g, (match) => {
		const path = match.slice(2, -1).trim();
		return variables[path];
	});
}

function format(duration) {
	// Calculate the hours, minutes, and seconds using modulo operators.
	const hours = duration / 3600000 | 0; /* eslint-disable-line no-bitwise */
	const minutes = (duration / 60000) % 60 | 0; /* eslint-disable-line no-bitwise */
	const seconds = (duration / 1000) % 60 | 0; /* eslint-disable-line no-bitwise */
	const milliseconds = duration % 1000;

	// Format the time.
	const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;

	return formattedTime;
}

// Initialise URL Params
const searchParams = new URLSearchParams(window.location.search);
const videoIframe = document.querySelector('iframe');
const videoId = searchParams.get('id');
const type = searchParams.get('type');
const time = +searchParams.get('t');
console.log(time);
if (type === 'y') {
	videoIframe.src = `https://img.youtube.com/vi/${videoId}/0.jpg`;
	// Load the IFrame Player API code asynchronously.
	const tag = document.createElement('script');
	tag.src = 'https://www.youtube.com/iframe_api';
	const firstScriptTag = document.getElementsByTagName('script')[0];
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else if (type === 't') {
	videoIframe.hidden = true;
}

// Load page elements
const totalTimeSpan = document.getElementById('total-time');
const startSpan = document.getElementById('start');
const goToStartButton = document.getElementById('go-to-start');
const endSpan = document.getElementById('end');
const goToEndButton = document.getElementById('go-to-end');
const currentTimeSpan = document.getElementById('current-time');
const modMessageText = document.getElementById('modMessage');
const modMessageButton = document.getElementById('modMessageButton');
const currentFrameSpan = document.getElementById('current-frame');
const framerateElement = document.getElementById('framerate');
const templatePauseElement = document.getElementById('pause-template');
const pauseContainer = document.getElementById('pause-container');
// eslint-disable-next-line no-template-curly-in-string
const currentModMessage = localStorage.getItem('currentModMessage') || 'Mod Message: Time starts at ${start} and ends at ${end}${pauses}with a framerate of ${framerate} FPS to get a final time of ${timeStr}.\nRetimed using [Better Speedrun Timer](https://noobjsperson.github.io/speedrun-timer)';
const pauseTimes = [];
// Create page variables
let start = null;
let end = null;
let currentMillis = 0;
let currentFrame = 0;
let framerate = 30;
let pauseCount = 0;
let isLoaded = false;
let twitch;

const customFramerate = localStorage.getItem('framerate');
if (customFramerate) framerateElement.value = customFramerate;

// Fallback Player
let player = {
	seekTo() {
		throw Error('unimplemented');
	},
	pauseVideo() {
		throw Error('unimplemented');
	},
	getCurrentTime() {
		throw Error('unimplemented');
	},
	playVideo() {
		throw Error('unimplemented');
	},
};

function validateFramerate() {
	framerate = parseInt(framerateElement.value || framerate, 10);
	framerateElement.value = framerate;
}

function updateCurrentTime() {
	currentMillis = Math.floor(player.getCurrentTime() * 1000);
	currentFrame = Math.floor(player.getCurrentTime() * framerate);
}

function setTime(millis) {
	player.pauseVideo();
	player.seekTo(millis);
}

function stepBy(amount) {
	player.pauseVideo();
	updateCurrentTime();
	setTime(Math.ceil(((currentFrame + amount) / framerate) * 1000) / 1000);
}
async function copyModMessage() {
	// Allow user to copy mod message to clipboard

	modMessageText.focus();
	modMessageText.select();
	document.execCommand('copy');
	alert('The mod message has been copied to clipboard! Please paste it into the comment of the run you are verifying.');

	/*
	// I dont know why this approach doesn't work. If you can fix it please make a pull request
	function oldCopy() {
		modMessageText.focus();
		modMessageText.select();
		document.execCommand('copy');
		alert('The mod message has been copied to clipboard! '
		+ 'Please paste it into the comment of the run you are verifying.');
	}
	const result = await navigator.permissions.query({ name: 'clipboard-write' });
	console.log(result.state);
	if (result.state === 'granted') {
		navigator.clipboard.writeText(modMessageText.innerText).then(
			() => {
				alert('The mod message has been copied to clipboard! '
				+ 'Please paste it into the comment of the run you are verifying.');
			},
			oldCopy,
		);
	} else {
		oldCopy();
	}
	*/
}
function updateTotalTime() {
	// handle negative time I guess
	if (start !== null && end !== null && start <= end) {
		const endFrame = Math.round((end / 1000) * framerate);
		const startFrame = Math.round((start / 1000) * framerate);
		let frames = endFrame - startFrame;

		for (let i = 0; i < pauseTimes.length; i++) {
			const pauseStart = pauseTimes[i][0];
			const pauseEnd = pauseTimes[i][1];
			if (pauseStart !== undefined && pauseEnd !== undefined && pauseStart <= pauseEnd) {
				const pauseEndFrame = Math.round((pauseEnd / 1000) * framerate);
				const pauseStartFrame = Math.round((pauseStart / 1000) * framerate);
				frames -= pauseEndFrame - pauseStartFrame;
			}
		}

		const ms = Math.floor((frames * 1000) / framerate);

		const timeStr = format(ms);
		const params = {
			start: format(start),
			end: format(end),
			timeStr,
			framerate,
			pauses: ' ',
		};
		if (pauseTimes.length) {
			console.log('does this work?');
			// eslint-disable-next-line quotes
			params.pauses = ` with pauses from ${pauseTimes.map((x) => (x[0] !== undefined && x[1] !== undefined && x[0] <= x[1] ? `from ${format(x[0])} to ${format(x[1])} ` : '')).join('and ')}`;
		}

		const modMessage = interpolate(currentModMessage, params);
		totalTimeSpan.innerHTML = timeStr;
		modMessageText.value = modMessage;

		modMessageButton.disabled = false;
		modMessageText.disabled = false;
	}
}

function showStart() {
	if (start === null) {
		return;
	}

	startSpan.innerHTML = start;
	goToStartButton.style.display = 'inline';
}

function setStart() {
	updateCurrentTime();
	start = currentMillis;
	showStart();
	updateTotalTime();
}

function goToStart() {
	setTime(start / 1000);
}

function showEnd() {
	if (end === null) {
		return;
	}

	endSpan.innerHTML = end;
	goToEndButton.style.display = 'inline';
}

function setEnd() {
	updateCurrentTime();
	end = currentMillis;
	showEnd();
	updateTotalTime();
}

function goToEnd() {
	setTime(end / 1000);
}

function updateCurrentTimeSpan() {
	updateCurrentTime();
	currentTimeSpan.innerHTML = currentMillis;
	currentFrameSpan.innerHTML = currentFrame;
}

function onPlayerReady() {
	player.playVideo();
	if (time) player.seekTo(time);
	// eslint-disable-next-line no-return-assign
	if (type === 't') setTimeout(() => framerateElement.value = twitch.getPlaybackStats().fps, 3000);
	setInterval(updateCurrentTimeSpan, 50);
}

// Load the player.
console.log(type);
if (type === 'y') {
	videoIframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
	let youtube;
	function onYoutubeChange(event) {
		if (event.data === -1) isLoaded = true;
	}

	function onYoutubeError(event) {
		console.log(event);
		if (event?.data === '5') return; // return if the video is private
		document.querySelector('.for-debug').style.display = 'initial';
		document.querySelector('.for-player').style.display = 'none';
	}

	function onYoutubeReady() {
		player = {
			seekTo(timestamp) {
				youtube.seekTo(timestamp);
			},
			pauseVideo() {
				youtube.pauseVideo();
			},
			getCurrentTime() {
				return youtube.getCurrentTime();
			},
			playVideo() {
				youtube.playVideo();
			},
		};
		onPlayerReady();
	}
	function onYouTubePlayerAPIReady() {
		// eslint-disable-next-line no-undef
		youtube = new YT.Player('video-iframe', {
			playerlets: {
				rel: 0,
			},
			events: {
				onReady: onYoutubeReady,
				onError: onYoutubeError,
				onStateChange: onYoutubeChange,
			},
		});
		setTimeout(() => {
			if (isLoaded !== true) onYoutubeError();
		}, 5000);
	}
} else if (type === 't') {
	// eslint-disable-next-line no-undef
	twitch = new Twitch.Player('video-div', {
		video: videoId,
	});

	player = {
		seekTo(timestamp) {
			// player.playVideo();
			twitch.seek(timestamp);
			// player.pauseVideo();
		},
		pauseVideo() {
			twitch.pause();
		},
		getCurrentTime() {
			return twitch.getCurrentTime();
		},
		playVideo() {
			twitch.play();
		},
	};
	// eslint-disable-next-line no-undef
	twitch.addEventListener(Twitch.Player.READY, onPlayerReady);
} else {
	document.body.innerText = "You shouldn't be here";
}
function parseForTime(event) {
	framerate = parseInt(document.getElementById('framerateAlt').value || framerate, 10);
	const { lct } = JSON.parse(event.target.value);
	// eslint-disable-next-line no-restricted-globals
	if (event.target.id === 'startobj') start = lct * 1000 | 0; /* eslint-disable-line no-bitwise */
	else end = lct * 1000 | 0; /* eslint-disable-line no-bitwise */
	document.getElementById(event.target.id).value = `${Math.floor(lct * framerate) / framerate}`;
}
function addPause() {
	const pause = templatePauseElement.cloneNode(true);
	pauseCount++;
	pause.id = pauseCount;
	pause.style.display = 'block';
	pauseContainer.appendChild(pause);
}
function deletePause(el) {
	pauseTimes.splice(+el.id - 1, 1);
	el.parentNode.parentNode.remove();
	pauseCount--;
}
function showPauseEnd(el) {
	const pauseEnd = pauseTimes[+el.parentNode.parentNode.id - 1][1];
	if (pauseEnd === null) {
		return;
	}

	el.parentNode.parentNode.querySelector('#pause-end').innerHTML = pauseEnd;
	el.parentNode.parentNode.querySelector('#go-to-end-pause').style.display = 'inline';
}
function showPauseStart(el) {
	const pauseStart = pauseTimes[+el.parentNode.parentNode.id - 1][0];
	if (pauseStart === null) {
		return;
	}

	el.parentNode.parentNode.querySelector('#pause-start').innerHTML = pauseStart;
	el.parentNode.parentNode.querySelector('#go-to-start-pause').style.display = 'inline';
}
function setPauseStart(el) {
	updateCurrentTime();
	const id = +el.parentNode.parentNode.id - 1;
	if (!pauseTimes[id]) pauseTimes[id] = [];
	pauseTimes[id][0] = currentMillis;
	showPauseStart(el);
	updateTotalTime();
}
function setPauseEnd(el) {
	updateCurrentTime();
	const id = +el.parentNode.parentNode.id - 1;
	if (!pauseTimes[id]) pauseTimes[id] = [];
	pauseTimes[id][1] = currentMillis;
	showPauseEnd(el);
	updateTotalTime();
}
function goToPauseEnd(el) {
	setTime(pauseTimes[+el.parentNode.parentNode.id - 1][1] / 1000);
}
function goToPauseStart(el) {
	setTime(pauseTimes[+el.parentNode.parentNode.id - 1][0] / 1000);
}
