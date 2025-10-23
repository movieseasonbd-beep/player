// DOM Elements
const playerContainer = document.querySelector('.player-container');
const loadingOverlay = document.querySelector('.loading-overlay');
const video = document.querySelector('.video');
const frameHoldCanvas = document.getElementById('frame-hold-canvas');
const ctx = frameHoldCanvas.getContext('2d');
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
const subtitleMenuBtn = document.getElementById('subtitle-menu-btn');
const subtitleSettingsPage = document.querySelector('.menu-subtitle');
const subtitleOptionsList = document.getElementById('subtitle-options-list');
const subtitleCurrentValue = subtitleMenuBtn ? subtitleMenuBtn.querySelector('.current-value') : null;
const downloadBtn = document.getElementById('download-btn');

let hls;
let controlsTimeout;
let isScrubbing = false;
let wasPlaying = false;
let qualityMenuInitialized = false;
let originalVideoUrl = null;
let wakeLock = null;

// ==========================================================
// === HLS Configuration (চূড়ান্ত অপটিমাইজেশনসহ) ===
// ==========================================================
const hlsConfig = {
    maxBufferLength: 30,
    maxMaxBufferLength: 600,
    startLevel: -1,
    abrBandWidthFactor: 0.95,
    abrBandWidthUpFactor: 0.8,
    maxStarveDuration: 2,
    maxBufferHole: 0.5,
};

// ==========================================================
// === Functions ===
// ==========================================================

const acquireWakeLock = async () => {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) { /* ignore */ }
    }
};

const releaseWakeLock = () => {
    if (wakeLock !== null) {
        wakeLock.release().then(() => { wakeLock = null; });
    }
};

function hideLoadingOverlay() {
    if (!loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
    }
}

function initializeHls() {
    if (hls) {
        hls.destroy();
    }
    hls = new Hls(hlsConfig);
    addHlsEvents();
}

function loadVideo(videoUrl) {
    setTimeout(hideLoadingOverlay, 3000);
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        initializeHls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        video.src = videoUrl;
    }
}

function setQuality(level, url = null) {
    const currentTime = video.currentTime;
    const isPlaying = !video.paused;

    const captureAndHoldFrame = () => {
        if (isPlaying && video.readyState > 2) {
            frameHoldCanvas.width = video.videoWidth;
            frameHoldCanvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, frameHoldCanvas.width, frameHoldCanvas.height);
            frameHoldCanvas.classList.remove('invisible');
            frameHoldCanvas.style.display = 'block';
        }
    };

    const hideCanvasOnPlay = () => {
        video.addEventListener('playing', () => {
            frameHoldCanvas.classList.add('invisible');
            setTimeout(() => {
                frameHoldCanvas.style.display = 'none';
            }, 300);
        }, { once: true });
    };

    if (url || (hls.url !== originalVideoUrl && !url)) {
        const newUrl = url || originalVideoUrl;

        captureAndHoldFrame();
        initializeHls();
        hls.loadSource(newUrl);
        hls.attachMedia(video);
        hideCanvasOnPlay();

        hls.once(Hls.Events.MANIFEST_PARSED, () => {
            if (!url) {
                hls.currentLevel = parseInt(level, 10);
            }
            video.currentTime = currentTime;
            if (isPlaying) video.play().catch(() => {});
        });

        if (url) {
            const qualityMenuBtn = document.getElementById('quality-menu-btn');
            if (qualityMenuBtn) {
                qualityMenuBtn.querySelector('.current-value').textContent = 'HD 1080p';
            }
            qualityOptionsList.querySelectorAll('li').forEach(opt => opt.classList.remove('active', 'playing'));
            const new1080pOption = qualityOptionsList.querySelector('li[data-level="1080"]');
            if (new1080pOption) new1080pOption.classList.add('active');
        }

    } 
    else {
        hls.currentLevel = parseInt(level, 10);
    }

    showMenuPage(mainSettingsPage);
}

function setupSubtitles() {
    if (!subtitleMenuBtn) return;
    const textTracks = video.textTracks;
    if (textTracks.length === 0) return;
    subtitleMenuBtn.style.display = 'flex';
    subtitleOptionsList.innerHTML = '';
    const offOption = document.createElement('li');
    offOption.textContent = 'Off';
    offOption.dataset.lang = 'off';
    offOption.classList.add('active');
    offOption.addEventListener('click', () => setSubtitle('off'));
    subtitleOptionsList.appendChild(offOption);
    for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        track.mode = 'hidden';
        const option = document.createElement('li');
        option.textContent = track.label;
        option.dataset.lang = track.language;
        option.addEventListener('click', () => setSubtitle(track.language));
        subtitleOptionsList.appendChild(option);
    }
}

function setSubtitle(lang) {
    const textTracks = video.textTracks;
    for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        track.mode = (track.language === lang) ? 'showing' : 'hidden';
    }
    subtitleOptionsList.querySelectorAll('li').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.lang === lang);
    });
    const activeTrack = [...textTracks].find(t => t.mode === 'showing');
    if(subtitleCurrentValue) subtitleCurrentValue.textContent = activeTrack ? activeTrack.label : 'Off';
    showMenuPage(mainSettingsPage);
}

function directTogglePlay() { 
    video.paused ? video.play() : video.pause();
}

function handleScreenTap() {
    // নতুন যুক্তি: যদি সেটিংস মেন্যু খোলা থাকে, তবে তা বন্ধ করো এবং আর কিছু করবে না।
    if (settingsMenu.classList.contains('active')) {
        settingsMenu.classList.remove('active');
        settingsBtn.classList.remove('active');
        return; // এই return-এর কারণে নিচের প্লে/পজ কোড আর কাজ করবে না।
    }

    // পুরোনো যুক্তি অপরিবর্তিত থাকবে
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
    if (video.duration && !isNaN(video.duration)) {
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
    if (isNaN(seconds) || seconds === Infinity) return "00:00";
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
        try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (err) { /* ignore */ }
    } else {
        await document.exitFullscreen();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (err) { /* ignore */ }
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

function addHlsEvents() {
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        if (qualityMenuInitialized) return;
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('id');
        if (data.levels.length > 0) {
            const qualityMenuBtn = document.getElementById('quality-menu-btn') || document.createElement('li');
            qualityMenuBtn.id = 'quality-menu-btn';
            qualityMenuBtn.innerHTML = `<div class="menu-item-label"> <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216,104H102.09L210,75.51a8,8,0,0,0,5.68-9.84l-8.16-30a15.93,15.93,0,0,0-19.42-11.13L35.81,64.74a15.75,15.75,0,0,0-9.7,7.4,15.51,15.51,0,0,0-1.55,12L32,111.56c0,.14,0,.29,0,.44v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V112A8,8,0,0,0,216,104ZM192.16,40l6,22.07L164.57,71,136.44,54.72ZM77.55,70.27l28.12,16.24-59.6,15.73-6-22.08Z"></path></svg> <span>Quality</span> </div> <div class="menu-item-value"> <span class="current-value">Auto</span> <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg> </div>`;
            qualityMenuBtn.addEventListener('click', () => { showMenuPage(qualitySettingsPage); });
            qualityOptionsList.innerHTML = '';
            const autoOption = document.createElement('li');
            autoOption.textContent = 'Auto';
            autoOption.dataset.level = -1;
            autoOption.classList.add('active');
            autoOption.addEventListener('click', () => setQuality(-1));
            qualityOptionsList.appendChild(autoOption);
            data.levels.forEach((level, index) => {
                const option = document.createElement('li');
                option.textContent = (level.height === 1080) ? `HD 1080p` : `${level.height}p`;
                option.dataset.level = index;
                option.addEventListener('click', () => setQuality(index));
                qualityOptionsList.appendChild(option);
            });
            if (!document.getElementById('quality-menu-btn')) {
                playerSettingsGroup.prepend(qualityMenuBtn);
            }
            const manifestHas1080p = data.levels.some(level => level.height === 1080);
            if (!manifestHas1080p) {
                try {
                    const currentUrl = new URL(videoUrl);
                    const pathSegments = currentUrl.pathname.split('/');
                    const lastSegmentIndex = pathSegments.findLastIndex(seg => seg.includes('.m3u8'));
                    if (lastSegmentIndex > -1) {
                        let segments1080 = [...pathSegments];
                        segments1080.splice(lastSegmentIndex, 0, '1080');
                        const potential1080pUrl = currentUrl.origin + segments1080.join('/') + currentUrl.search;
                        fetch(potential1080pUrl, { method: 'HEAD' })
                            .then(response => {
                                if (response.ok) {
                                    const option1080p = document.createElement('li');
                                    option1080p.textContent = 'HD 1080p';
                                    option1080p.dataset.level = '1080';
                                    option1080p.addEventListener('click', () => setQuality('1080', potential1080pUrl));
                                    qualityOptionsList.appendChild(option1080p);
                                }
                            });
                    }
                } catch (e) { /* ignore */ }
            }
        }
        qualityMenuInitialized = true;
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        if (hls.url !== originalVideoUrl) return;
        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (!qualityMenuBtn) return;
        const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
        const allQualityOptions = qualityOptionsList.querySelectorAll('li');
        allQualityOptions.forEach(opt => opt.classList.remove('active', 'playing'));
        const external1080p = qualityOptionsList.querySelector('li[data-level="1080"]');
        if (external1080p) external1080p.classList.remove('active');
        const activeLevel = hls.levels[data.level];
        if (!activeLevel) return;
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
        if (data.fatal) {
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                default: hls.destroy(); break;
            }
        }
    });
}

// === General Event Listeners ===
video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);

video.addEventListener('play', () => { 
    updatePlayState();
    resetControlsTimer(); 
    acquireWakeLock(); 
});

// ==========================================================
// === নতুন সমাধান: প্রথমবার প্লে হলে পোস্টার মুছে ফেলা ===
// ==========================================================
video.addEventListener('play', () => {
    if (video.poster) {
        video.poster = '';
    }
}, { once: true });


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
        [mainSettingsPage, speedSettingsPage, qualitySettingsPage, subtitleSettingsPage]
            .filter(p => p)
            .forEach(p => p.classList.remove('active', 'slide-out-left', 'slide-out-right'));
        mainSettingsPage.classList.add('active');
        menuContentWrapper.style.height = `${mainSettingsPage.scrollHeight}px`;
    }
});

speedMenuBtn.addEventListener('click', () => { showMenuPage(speedSettingsPage); });
if (subtitleMenuBtn) {
    subtitleMenuBtn.addEventListener('click', () => { showMenuPage(subtitleSettingsPage); });
}
backBtns.forEach(btn => btn.addEventListener('click', () => showMenuPage(mainSettingsPage)));

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

// === Page Load ===
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    const subtitleUrl = urlParams.get('sub');
    const downloadUrl = urlParams.get('download');
    const posterUrl = urlParams.get('poster');

    originalVideoUrl = videoUrl;

    if (videoUrl) {
        if (posterUrl) video.poster = posterUrl;
        if (subtitleUrl && subtitleMenuBtn) {
            const subtitleTrack = document.createElement('track');
            subtitleTrack.kind = 'subtitles';
            subtitleTrack.srclang = 'bn';
            subtitleTrack.label = 'বাংলা';
            subtitleTrack.src = subtitleUrl;
            subtitleTrack.default = true;
            video.appendChild(subtitleTrack);
        }
        if (downloadUrl && downloadBtn) {
            downloadBtn.style.display = 'flex';
            downloadBtn.addEventListener('click', () => {
                const a = document.createElement('a'); a.href = downloadUrl; a.download = '';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            });
        }
        loadVideo(videoUrl);
    } else {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
    
    video.addEventListener('loadedmetadata', updateProgressUI);
    video.addEventListener('loadedmetadata', setupSubtitles);
    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
});
