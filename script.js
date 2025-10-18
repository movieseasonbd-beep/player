// DOM Elements
const playerContainer = document.querySelector('.player-container');
const loadingOverlay = document.querySelector('.loading-overlay');
const video = document.querySelector('.video');
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
let wakeLock = null;

// Functions
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (err) {
      console.error(`${err.name}, ${err.message}`);
    }
  }
};

async function releaseWakeLock() {
  if (wakeLock !== null) {
    await wakeLock.release();
    wakeLock = null;
  }
};

function hideLoadingScreen() {
    loadingOverlay.classList.add('hidden');
}

function loadVideo(videoUrl) {
    hls.destroy(); 
    hls = new Hls();
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else { 
        video.src = videoUrl; 
    }
}

function togglePlay() { 
    if (video.src) video.paused ? video.play() : video.pause(); 
}

function updatePlayState() {
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    
    if (video.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playerContainer.classList.add('show-controls');
    } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playerContainer.classList.remove('show-controls');
    }
    
    playerContainer.classList.toggle('playing', !video.paused);
    playerContainer.classList.toggle('paused', video.paused);
}

function updateProgressUI() {
    let progressPercent = 0;
    if (video.duration) {
        progressPercent = (video.currentTime / video.duration) * 100;
    }
    progressFilled.style.width = `${progressPercent}%`;
    progressBar.value = progressPercent;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
}

function updateBufferBar() {
    if (video.duration > 0 && video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = (bufferEnd / video.duration) * 100;
        bufferBar.style.width = `${bufferPercent}%`;
    }
}

function scrub(e) {
    const value = e.target.value;
    const scrubTime = (value / 100) * video.duration;
    if (!isNaN(scrubTime)) { video.currentTime = scrubTime; }
    progressFilled.style.width = `${value}%`;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(scrubTime)} / ${formatTime(totalDuration)}`;
}

function formatTime(seconds) {
    if (isNaN(seconds)) seconds = 0;
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleMute() { video.muted = !video.muted; }

function updateVolumeIcon() {
    const volumeOnIcon = volumeBtn.querySelector('.volume-on-icon');
    const volumeOffIcon = volumeBtn.querySelector('.volume-off-icon');
    
    if (video.muted || video.volume === 0) {
        volumeOnIcon.style.display = 'none';
        volumeOffIcon.style.display = 'block';
    } else {
        volumeOnIcon.style.display = 'block';
        volumeOffIcon.style.display = 'none';
    }
    volumeBtn.classList.toggle('active', video.muted);
}

async function toggleFullscreen() {
    if (!document.fullscreenElement) {
        await playerContainer.requestFullscreen().catch(err => {
            alert(`Fullscreen error: ${err.message}`);
        });
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
        } catch (err) {
            console.warn("Screen orientation lock failed:", err);
        }
    } else {
        await document.exitFullscreen();
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {
            console.warn("Screen orientation unlock failed:", err);
        }
    }
}

function updateFullscreenState() {
    const fullscreenOnIcon = fullscreenBtn.querySelector('.fullscreen-on-icon');
    const fullscreenOffIcon = fullscreenBtn.querySelector('.fullscreen-off-icon');
    const isFullscreen = !!document.fullscreenElement;
    
    if (isFullscreen) {
        fullscreenOnIcon.style.display = 'none';
        fullscreenOffIcon.style.display = 'block';
    } else {
        fullscreenOnIcon.style.display = 'block';
        fullscreenOffIcon.style.display = 'none';
    }
    
    fullscreenBtn.classList.toggle('active', isFullscreen);
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}

function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
}

function showTemporaryControls() {
    playerContainer.classList.add('show-controls');
    clearTimeout(controlsTimeout);
    
    if (!video.paused) {
        controlsTimeout = setTimeout(() => {
            playerContainer.classList.remove('show-controls');
        }, 3000);
    }
}

// Event Listeners
video.addEventListener('click', togglePlay);
video.addEventListener('mousemove', showTemporaryControls);
playerContainer.addEventListener('mouseleave', () => {
    if (!video.paused) {
        playerContainer.classList.remove('show-controls');
    }
});

video.addEventListener('play', () => {
    updatePlayState();
    requestWakeLock();
});

video.addEventListener('pause', () => {
    updatePlayState();
    releaseWakeLock();
});

video.addEventListener('ended', releaseWakeLock);
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('canplay', () => {
    updateProgressUI();
    updateBufferBar();
    updatePlayState();
});
video.addEventListener('volumechange', updateVolumeIcon);

centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { if(video.duration) video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { if(video.duration) video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);
progressBar.addEventListener('input', scrub);
settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

document.addEventListener('DOMContentLoaded', () => {
    updatePlayState();
    updateProgressUI();
    updateVolumeIcon();
    updateFullscreenState();

    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        loadVideo(videoUrl);
        setTimeout(hideLoadingScreen, 3000);
    } else {
        hideLoadingScreen();
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
});

document.addEventListener('visibilitychange', async () => {
  if (wakeLock !== null && document.visibilityState === 'hidden') {
    await releaseWakeLock();
  } else if (document.visibilityState === 'visible' && !video.paused) {
    await requestWakeLock();
  }
});
