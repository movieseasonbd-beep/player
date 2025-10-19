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
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.querySelector('.settings-menu');
const closeSettingsBtn = settingsMenu.querySelector('.close-btn');
const volumeSlider = document.querySelector('.volume-slider');
const speedMenuBtn = document.getElementById('speed-menu-btn');
const qualityMenuBtn = document.getElementById('quality-menu-btn');
const speedSubmenu = document.querySelector('.speed-submenu');
const qualitySubmenu = document.querySelector('.quality-submenu');
const backBtns = document.querySelectorAll('.back-btn');
const speedOptions = document.querySelectorAll('#speed-options li');
const qualityOptionsList = document.getElementById('quality-options');
const currentQualityDisplay = document.getElementById('current-quality');
const currentSpeedDisplay = speedMenuBtn.querySelector('.menu-value');

let hls = new Hls();
let controlsTimeout;
let isScrubbing = false;
let wasPlaying = false;
let lastTap = 0;

// ==========================================================
// === ফাংশনসমূহ ===
// ==========================================================

function loadVideo(videoUrl) {
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        qualityMenuBtn.style.display = 'flex';
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        qualityMenuBtn.style.display = 'none';
        video.src = videoUrl;
    }
}

function directTogglePlay() {
    video.paused ? video.play() : video.pause();
}

function handleScreenTap(e) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) { // ডাবল ট্যাপ
        const rect = video.getBoundingClientRect();
        const tapPosition = (e.clientX - rect.left) / rect.width;
        if (tapPosition < 0.4) {
            video.currentTime -= 10;
        } else if (tapPosition > 0.6) {
            video.currentTime += 10;
        }
        e.preventDefault();
        lastTap = 0; // ডাবল ট্যাপ রিসেট
    } else { // সিঙ্গেল ট্যাপ
        if (video.paused) {
            video.play();
        } else {
            playerContainer.classList.toggle('show-controls');
            if (playerContainer.classList.contains('show-controls')) {
                 resetControlsTimer();
            } else {
                 clearTimeout(controlsTimeout);
            }
        }
    }
    lastTap = currentTime;
}

function updatePlayState() {
    const isPaused = video.paused;
    playPauseBtn.querySelector('.play-icon').style.display = isPaused ? 'block' : 'none';
    playPauseBtn.querySelector('.pause-icon').style.display = isPaused ? 'none' : 'block';
    playerContainer.classList.toggle('paused', isPaused);
    playerContainer.classList.toggle('playing', !isPaused);
}

function hideControls() {
    if (!video.paused && !settingsMenu.classList.contains('active') && !isScrubbing) {
        playerContainer.classList.remove('show-controls');
    }
}

function resetControlsTimer() {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
}

function updateProgressUI() {
    if (isScrubbing) return;
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

function scrub(e) {
    const scrubTime = (e.target.value / 100) * video.duration;
    if (!isNaN(scrubTime)) {
       video.currentTime = scrubTime;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh > 0) {
        return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
}

function toggleMute() {
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) {
        video.volume = 0.5;
    }
}

function updateVolume() {
    const isMuted = video.muted || video.volume === 0;
    volumeBtn.querySelector('.volume-on-icon').style.display = isMuted ? 'none' : 'block';
    volumeBtn.querySelector('.volume-off-icon').style.display = isMuted ? 'block' : 'none';
    volumeBtn.classList.toggle('active', isMuted);
    volumeSlider.value = video.muted ? 0 : video.volume;
}

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await playerContainer.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (err) {
        console.error("Fullscreen API error:", err);
    }
}

function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
    fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
    fullscreenBtn.classList.toggle('active', isFullscreen);
}

function toggleSettingsMenu() {
    const isActive = settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', isActive);
    if (!isActive) {
        settingsMenu.classList.remove('submenu-active');
        qualitySubmenu.classList.remove('active');
        speedSubmenu.classList.remove('active');
    }
}

// ==========================================================
// === Event Listeners ===
// ==========================================================

video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);

video.addEventListener('play', () => { updatePlayState(); resetControlsTimer(); });
video.addEventListener('pause', () => { updatePlayState(); clearTimeout(controlsTimeout); playerContainer.classList.add('show-controls'); });
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('volumechange', updateVolume);
video.addEventListener('canplay', updateProgressUI);
video.addEventListener('loadedmetadata', updateProgressUI);

rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);

progressBar.addEventListener('input', scrub);
progressBar.addEventListener('mousedown', () => { isScrubbing = true; wasPlaying = !video.paused; if(wasPlaying) video.pause(); });
document.addEventListener('mouseup', () => { if(isScrubbing) { isScrubbing = false; if(wasPlaying) video.play(); }});
progressBar.addEventListener('touchstart', () => { isScrubbing = true; wasPlaying = !video.paused; if(wasPlaying) video.pause(); }, { passive: true });
document.addEventListener('touchend', () => { if(isScrubbing) { isScrubbing = false; if(wasPlaying) video.play(); }});

playerContainer.addEventListener('mousemove', () => {
    playerContainer.classList.add('show-controls');
    resetControlsTimer();
});
playerContainer.addEventListener('mouseleave', hideControls);

volumeSlider.addEventListener('input', e => {
    video.volume = e.target.value;
    video.muted = e.target.value === "0";
});

// Settings Menu Navigation
settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);

qualityMenuBtn.addEventListener('click', () => {
    settingsMenu.classList.add('submenu-active');
    qualitySubmenu.classList.add('active');
});

speedMenuBtn.addEventListener('click', () => {
    settingsMenu.classList.add('submenu-active');
    speedSubmenu.classList.add('active');
});

backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        settingsMenu.classList.remove('submenu-active');
        qualitySubmenu.classList.remove('active');
        speedSubmenu.classList.remove('active');
    });
});

speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentSpeedDisplay.textContent = `${option.dataset.speed}x`;
        toggleSettingsMenu(); // Close menu after selection
    });
});

hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
    qualityOptionsList.innerHTML = "";
    const autoOption = document.createElement('li');
    autoOption.textContent = 'Auto';
    autoOption.dataset.level = -1;
    autoOption.classList.add('active');
    qualityOptionsList.appendChild(autoOption);
    currentQualityDisplay.textContent = "Auto";
    
    data.levels.reverse().forEach((level, index) => {
        const option = document.createElement('li');
        option.textContent = `${level.height}p`;
        option.dataset.level = data.levels.length - 1 - index;
        qualityOptionsList.appendChild(option);
    });

    qualityOptionsList.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            hls.currentLevel = parseInt(li.dataset.level, 10);
            qualityOptionsList.querySelectorAll('li').forEach(opt => opt.classList.remove('active'));
            li.classList.add('active');
            currentQualityDisplay.textContent = li.textContent;
            toggleSettingsMenu();
        });
    });
});

document.addEventListener('keydown', e => {
    const tagName = document.activeElement.tagName.toLowerCase();
    if (tagName === 'input') return;

    switch(e.key.toLowerCase()) {
        case ' ': case 'k':
            e.preventDefault(); directTogglePlay(); break;
        case 'f':
            toggleFullscreen(); break;
        case 'm':
            toggleMute(); break;
        case 'arrowleft':
            video.currentTime -= 5; break;
        case 'arrowright':
            video.currentTime += 5; break;
        case 'arrowup':
             e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
        case 'arrowdown':
             e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        loadVideo(videoUrl);
        video.addEventListener('canplay', () => loadingOverlay.classList.add('hidden'), { once: true });
        setTimeout(() => loadingOverlay.classList.add('hidden'), 5000);
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.querySelector('.loading-content').innerHTML = "No video source found.";
    }

    updatePlayState();
    updateVolume();
    updateFullscreenState();
});
