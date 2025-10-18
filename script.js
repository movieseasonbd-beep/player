// DOM Elements
const playerContainer = document.querySelector('.player-container');
const loadingOverlay = document.querySelector('.loading-overlay');
const video = document.querySelector('.video');
const controlsContainer = document.querySelector('.controls-container');
const centralPlayBtn = document.querySelector('.central-play-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeBtn = document.getElementById('volume-btn');
const progressBar = document.querySelector('.progress-bar');
const progressFilled = document.querySelector('.progress-filled');
const bufferBar = document.querySelector('.buffer-bar');
const timeDisplay = document.querySelector('.time-display');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const fullscreenTooltip = fullscreenBtn.querySelector('.tooltip');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.querySelector('.settings-menu');
const closeSettingsBtn = settingsMenu.querySelector('.close-btn');
const speedOptions = settingsMenu.querySelectorAll('li');

let hls = new Hls();
let controlsTimeout;

// === নতুন পরিবর্তন: স্ক্রাবিং এর অবস্থা ট্র্যাক করার জন্য ভ্যারিয়েবল ===
let isScrubbing = false;
let wasPlaying = false;

// ==========================================================
// === ফাংশনসমূহ ===
// ==========================================================

function loadVideo(videoUrl) {
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        video.src = videoUrl;
    }
}

function directTogglePlay() {
    video.paused ? video.play() : video.pause();
}

function handleScreenTap() {
    const isControlsVisible = getComputedStyle(controlsContainer).opacity === '1';
    if (video.paused) {
        video.play();
    } else {
        if (isControlsVisible) {
            video.pause();
        } else {
            playerContainer.classList.add('show-controls');
            resetControlsTimer();
        }
    }
}

function updatePlayState() {
    const isPaused = video.paused;
    playPauseBtn.querySelector('.play-icon').style.display = isPaused ? 'block' : 'none';
    playPauseBtn.querySelector('.pause-icon').style.display = isPaused ? 'none' : 'block';
    playerContainer.classList.toggle('paused', isPaused);
    playerContainer.classList.toggle('playing', !isPaused);
}

function hideControls() {
    if (!video.paused && !settingsMenu.classList.contains('active')) {
        playerContainer.classList.remove('show-controls');
    }
}

function resetControlsTimer() {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
}

// === নতুন পরিবর্তন: স্ক্রাবিং এর সময় যেন এই ফাংশনটি UI আপডেট না করে ===
function updateProgressUI() {
    if (isScrubbing) return; // যদি টানা হয়, তাহলে কিছু করবে না
    if (video.duration) {
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = progressPercent;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
}

function updateBufferBar() {
    if (video.duration > 0 && video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        bufferBar.style.width = `${(bufferEnd / video.duration) * 100}%`;
    }
}

// === নতুন পরিবর্তন: এই ফাংশনটি এখন UI ও আপডেট করবে ===
function scrub(e) {
    const scrubTime = (e.target.value / 100) * video.duration;
    if (isNaN(scrubTime)) return;
    
    video.currentTime = scrubTime;
    
    // ম্যানুয়ালি UI আপডেট করা হচ্ছে দ্রুত রেসপন্সের জন্য
    progressFilled.style.width = `${e.target.value}%`;
    timeDisplay.textContent = `${formatTime(scrubTime)} / ${formatTime(video.duration)}`;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleMute() {
    video.muted = !video.muted;
}

function updateVolumeIcon() {
    const isMuted = video.muted || video.volume === 0;
    volumeBtn.querySelector('.volume-on-icon').style.display = isMuted ? 'none' : 'block';
    volumeBtn.querySelector('.volume-off-icon').style.display = isMuted ? 'block' : 'none';
}

async function toggleFullscreen() {
    if (!document.fullscreenElement) {
        await playerContainer.requestFullscreen();
        try {
            if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
        } catch (err) { console.warn("Screen orientation lock failed:", err); }
    } else {
        await document.exitFullscreen();
        try {
            if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        } catch (err) { console.warn("Screen orientation unlock failed:", err); }
    }
}

function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
    fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}

function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
}

// ==========================================================
// === Event Listeners (ইভেন্ট লিসেনার) ===
// ==========================================================

video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);

video.addEventListener('play', () => { updatePlayState(); resetControlsTimer(); });
video.addEventListener('pause', () => { updatePlayState(); clearTimeout(controlsTimeout); playerContainer.classList.add('show-controls'); });
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('volumechange', updateVolumeIcon);
video.addEventListener('canplay', updateProgressUI);

rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);

// === নতুন পরিবর্তন: স্ক্রাবিং এর জন্য নতুন ইভেন্ট লিসেনার ===
progressBar.addEventListener('input', scrub);
progressBar.addEventListener('mousedown', () => {
    isScrubbing = true;
    wasPlaying = !video.paused;
    if (wasPlaying) {
        video.pause();
    }
});
document.addEventListener('mouseup', () => {
    if (isScrubbing) {
        isScrubbing = false;
        if (wasPlaying) {
            video.play();
        }
    }
});

settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        toggleSettingsMenu();
    });
});

playerContainer.addEventListener('mousemove', () => {
    playerContainer.classList.add('show-controls');
    resetControlsTimer();
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        loadVideo(videoUrl);
        setTimeout(() => loadingOverlay.classList.add('hidden'), 3000);
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }

    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
});
