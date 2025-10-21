// DOM Elements (অপরিবর্তিত)
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
const menuContentWrapper = document.querySelector('.menu-content-wrapper');
const mainSettingsPage = document.querySelector('.menu-main');
const speedSettingsPage = document.querySelector('.menu-speed');
const qualitySettingsPage = document.querySelector('.menu-quality');
const speedMenuBtn = document.getElementById('speed-menu-btn');
const playerSettingsGroup = document.getElementById('player-settings-group');
const speedOptionsList = document.getElementById('speed-options-list');
const qualityOptionsList = document.getElementById('quality-options-list');
const backBtns = document.querySelectorAll('.back-btn');
const speedCurrentValue = speedMenuBtn.querySelector('.current-value');
const speedOptions = speedOptionsList.querySelectorAll('li');

let hls;
let controlsTimeout;
let isScrubbing = false;
let wasPlaying = false;
let qualityMenuInitialized = false;
let wakeLock = null;

// HLS Configuration (উন্নত করা)
const hlsConfig = {
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    startLevel: -1,
    capLevelToPlayerSize: false,
    abrEwmaSlowVoD: 4.0,
    abrEwmaFastVoD: 1.0,
};

// ==========================================================
// === Functions ===
// ==========================================================
const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
        }
    }
};
const releaseWakeLock = () => {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
};

function initializeHls() {
    if (hls) {
        hls.destroy();
    }
    hls = new Hls(hlsConfig);
    addHlsEvents();
}

function loadVideo(videoUrl) {
    const hideLoadingScreen = () => {
        if (!loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
    };
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        initializeHls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.FRAG_BUFFERED, function onFragBuffered() {
            hls.off(Hls.Events.FRAG_BUFFERED, onFragBuffered);
            hideLoadingScreen();
        });
    } else {
        video.src = videoUrl;
        video.addEventListener('canplay', hideLoadingScreen, { once: true });
    }
    setTimeout(hideLoadingScreen, 3000);
}

// === এই ফাংশনটি নতুন করে লেখা হয়েছে ===
function setQuality(level) {
    hls.currentLevel = parseInt(level, 10);
    showMenuPage(mainSettingsPage);
}


// === Player UI Functions (সব অপরিবর্তিত) ===
function directTogglePlay() { video.paused ? video.play() : video.pause(); }
function handleScreenTap() {
    const isControlsVisible = getComputedStyle(controlsContainer).opacity === '1';
    if (video.paused) { video.play(); } else {
        if (isControlsVisible) { video.pause(); }
        else { playerContainer.classList.add('show-controls'); resetControlsTimer(); }
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
    if (isNaN(scrubTime)) return;
    video.currentTime = scrubTime;
    progressFilled.style.width = `${e.target.value}%`;
    timeDisplay.textContent = `${formatTime(scrubTime)} / ${formatTime(video.duration)}`;
}
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}
function toggleMute() { video.muted = !video.muted; }
function updateVolumeIcon() {
    const isMuted = video.muted || video.volume === 0;
    volumeBtn.querySelector('.volume-on-icon').style.display = isMuted ? 'none' : 'block';
    volumeBtn.querySelector('.volume-off-icon').style.display = isMuted ? 'block' : 'none';
    volumeBtn.classList.toggle('active', isMuted);
}
async function toggleFullscreen() {
    if (!document.fullscreenElement) {
        await playerContainer.requestFullscreen();
        try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (err) { console.warn("Screen orientation lock failed:", err); }
    } else {
        await document.exitFullscreen();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (err) { console.warn("Screen orientation unlock failed:", err); }
    }
}
function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
    fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
    fullscreenBtn.classList.toggle('active', isFullscreen);
}
function showMenuPage(pageToShow) {
    const currentPage = menuContentWrapper.querySelector('.menu-page.active');
    setTimeout(() => {
        const newHeight = pageToShow.scrollHeight;
        menuContentWrapper.style.height = `${newHeight}px`;
    }, 0);
    if (currentPage) {
        if (pageToShow === mainSettingsPage) {
            currentPage.classList.remove('active');
            currentPage.classList.add('slide-out-right');
            mainSettingsPage.classList.remove('slide-out-left');
            mainSettingsPage.classList.add('active');
        } else {
            mainSettingsPage.classList.add('slide-out-left');
            currentPage.classList.remove('active');
            pageToShow.classList.add('active');
            pageToShow.classList.remove('slide-out-right');
        }
    }
}

// ==========================================================
// === HLS Event Listeners ===
// ==========================================================
function addHlsEvents() {
    // === এই ফাংশনটি সম্পূর্ণ নতুন করে লেখা হয়েছে ===
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        if (qualityMenuInitialized) return;
        
        const buildQualityMenu = () => {
            let qualityMenuBtn = document.getElementById('quality-menu-btn');
            if (!qualityMenuBtn) {
                qualityMenuBtn = document.createElement('li');
                qualityMenuBtn.id = 'quality-menu-btn';
                playerSettingsGroup.prepend(qualityMenuBtn);
            }
            
            qualityMenuBtn.innerHTML = `<div class="menu-item-label"> <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216,104H102.09L210,75.51a8,8,0,0,0,5.68-9.84l-8.16-30a15.93,15.93,0,0,0-19.42-11.13L35.81,64.74a15.75,15.75,0,0,0-9.7,7.4,15.51,15.51,0,0,0-1.55,12L32,111.56c0,.14,0,.29,0,.44v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V112A8,8,0,0,0,216,104ZM192.16,40l6,22.07L164.57,71,136.44,54.72ZM77.55,70.27l28.12,16.24-59.6,15.73-6-22.08Z"></path></svg> <span>Quality</span> </div> <div class="menu-item-value"> <span class="current-value">Auto</span> <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg> </div>`;
            qualityMenuBtn.addEventListener('click', () => { showMenuPage(qualitySettingsPage); });

            qualityOptionsList.innerHTML = '';
            const autoOption = document.createElement('li');
            autoOption.textContent = 'Auto';
            autoOption.dataset.level = -1;
            autoOption.classList.add('active');
            autoOption.addEventListener('click', () => setQuality(-1));
            qualityOptionsList.appendChild(autoOption);

            hls.levels.forEach((level, index) => {
                if (level.height > 0) {
                    const option = document.createElement('li');
                    option.textContent = (level.height === 1080) ? `HD 1080p` : `${level.height}p`;
                    option.dataset.level = index;
                    option.addEventListener('click', () => setQuality(index));
                    qualityOptionsList.appendChild(option);
                }
            });
        };

        buildQualityMenu();
        qualityMenuInitialized = true;

        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('id');
        const manifestHas1080p = hls.levels.some(level => level.height === 1080);

        if (!manifestHas1080p) {
            try {
                const currentUrl = new URL(videoUrl);
                const pathSegments = currentUrl.pathname.split('/');
                const lastSegmentIndex = pathSegments.findLastIndex(seg => seg.includes('.m3u8'));
                if (lastSegmentIndex > -1) {
                    let segments1080 = [...pathSegments];
                    segments1080.splice(lastSegmentIndex, 0, '1080');
                    const potential1080pUrl = currentUrl.origin + segments1080.join('/') + currentUrl.search;
                    
                    fetch(potential1080pUrl)
                        .then(response => {
                            if (response.ok) return response.text();
                            throw new Error('Network response was not ok.');
                        })
                        .then(manifestText => {
                            const newLevel = {
                                url: potential1080pUrl,
                                height: 1080,
                                name: "1080",
                            };
                            hls.levels.push(newLevel);
                            buildQualityMenu(); // তালিকাটি আবার তৈরি করুন
                        })
                        .catch(error => {
                            console.error("Could not fetch or add 1080p level:", error);
                        });
                }
            } catch (e) {
                console.error("Error while trying to guess 1080p URL:", e);
            }
        }
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        // ... (এই ফাংশনটি অপরিবর্তিত)
        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (!qualityMenuBtn) return;
        const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
        const allQualityOptions = qualityOptionsList.querySelectorAll('li');
        allQualityOptions.forEach(opt => {
            opt.classList.remove('active');
            opt.classList.remove('playing');
        });
        const activeLevel = hls.levels[data.level];
        if (!activeLevel || activeLevel.height === 0) return;
        if (hls.autoLevelEnabled) {
            qualityCurrentValue.textContent = (activeLevel.height === 1080) ? `HD 1080p (Auto)` : `${activeLevel.height}p (Auto)`;
            const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]');
            if (autoOpt) autoOpt.classList.add('active');
            const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`);
            if (currentPlayingOpt) currentPlayingOpt.classList.add('playing');
        } else {
            qualityCurrentValue.textContent = (activeLevel.height === 1080) ? `HD 1080p` : `${activeLevel.height}p`;
            const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`);
            if (currentPlayingOpt) currentPlayingOpt.classList.add('active');
        }
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
        // ... (এই ফাংশনটি অপরিবর্তিত)
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('Fatal network error encountered, trying to recover...', data);
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('Fatal media error encountered, trying to recover...', data);
                    hls.recoverMediaError();
                    break;
                default:
                    console.error('An unrecoverable fatal error occurred, destroying hls instance', data);
                    hls.destroy();
                    break;
            }
        }
    });
}

// ==========================================================
// === General Event Listeners (অপরিবর্তিত) ===
// ==========================================================
video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);
video.addEventListener('play', () => { 
    updatePlayState(); 
    resetControlsTimer();
    acquireWakeLock();
});
video.addEventListener('pause', () => { 
    updatePlayState(); 
    clearTimeout(controlsTimeout); 
    playerContainer.classList.add('show-controls');
    releaseWakeLock();
});
video.addEventListener('ended', releaseWakeLock);
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('volumechange', updateVolumeIcon);
video.addEventListener('canplay', updateProgressUI);
rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);
progressBar.addEventListener('input', scrub);
progressBar.addEventListener('mousedown', () => {
    isScrubbing = true;
    wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
});
document.addEventListener('mouseup', () => {
    if (isScrubbing) {
        isScrubbing = false;
        if (wasPlaying) video.play();
    }
});
playerContainer.addEventListener('mousemove', () => {
    playerContainer.classList.add('show-controls');
    resetControlsTimer();
});
settingsBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
    if (settingsMenu.classList.contains('active')) {
        [mainSettingsPage, speedSettingsPage, qualitySettingsPage].forEach(p => {
            p.classList.remove('active', 'slide-out-left', 'slide-out-right');
        });
        mainSettingsPage.classList.add('active');
        menuContentWrapper.style.height = `${mainSettingsPage.scrollHeight}px`;
    }
});
speedMenuBtn.addEventListener('click', () => { showMenuPage(speedSettingsPage); });
backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        showMenuPage(mainSettingsPage);
    });
});
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = parseFloat(option.dataset.speed);
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        speedCurrentValue.textContent = option.dataset.speed === '1' ? 'Normal' : `${option.dataset.speed}x`;
        showMenuPage(mainSettingsPage);
    });
});
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && wakeLock !== null) {
        releaseWakeLock();
    } else if (document.visibilityState === 'visible' && !video.paused) {
        acquireWakeLock();
    }
});

// ==========================================================
// === Page Load (অপরিবর্তিত) ===
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) {
        loadVideo(videoUrl);
    } else {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
});
