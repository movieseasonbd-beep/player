// DOM Elements
const playerContainer = document.querySelector('.player-container');
const loadingOverlay = document.querySelector('.loading-overlay');
const loadingMainText = document.querySelector('.loading-maintext');
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

// Global Variables
let hls;
let controlsTimeout;
let isScrubbing = false;
let wasPlaying = false;
let qualityMenuInitialized = false;
let originalVideoUrl = null;
let wakeLock = null;

// ==========================================================
// === FFmpeg.wasm Integration (with Timeout Failsafe)    ===
// ==========================================================
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
});

async function playMkvWithFfmpeg(videoUrl) {
    let failureTimeout; // Timeout variable

    try {
        // Set a 60-second timeout as a failsafe
        failureTimeout = setTimeout(() => {
            console.error("Timeout: MKV processing took too long or failed.");
            loadingMainText.textContent = "Error Loading Video";
            // Hide the animation bar and show an error message
            document.querySelector('.loading-bar-container').style.display = 'none';
            document.querySelector('.loading-subtext').textContent = "File might be corrupted or unsupported.";
            try {
                if (ffmpeg.isLoaded()) {
                    ffmpeg.exit(); // Attempt to terminate the ffmpeg process
                }
            } catch (e) {}
        }, 60000); // 60 seconds (60,000 milliseconds)

        if (!ffmpeg.isLoaded()) {
            loadingMainText.textContent = "Loading Player Engine...";
            await ffmpeg.load();
        }
        loadingMainText.textContent = "Fetching Video...";
        const videoData = await fetchFile(videoUrl);
        loadingMainText.textContent = "Preparing Video...";
        ffmpeg.FS('writeFile', 'input.mkv', videoData);
        loadingMainText.textContent = "Converting... Please Wait.";
        await ffmpeg.run('-i', 'input.mkv', '-c', 'copy', 'output.mp4');
        loadingMainText.textContent = "Almost Ready...";
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        if (Hls.isSupported() && hls) {
            hls.destroy();
        }

        video.src = url;

        video.addEventListener('canplay', () => {
            // If video loads successfully, clear the timeout
            clearTimeout(failureTimeout);
            hideLoadingOverlay();
            console.log("MKV video is now ready to be played.");
        }, { once: true });

    } catch (error) {
        // If any other error occurs, also clear the timeout
        clearTimeout(failureTimeout);
        console.error("Error playing MKV file:", error);
        loadingMainText.textContent = "Failed to load video.";
        document.querySelector('.loading-bar-container').style.display = 'none';
    }
}


// ==========================================================
// === Original Player Functions                          ===
// ==========================================================
const hlsConfig = { maxBufferLength: 30, maxMaxBufferLength: 600, startLevel: -1, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.8, maxStarveDuration: 2, maxBufferHole: 0.5 };
const acquireWakeLock = async () => { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} } };
const releaseWakeLock = () => { if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); } };
function hideLoadingOverlay() { if (!loadingOverlay.classList.contains('hidden')) { loadingOverlay.classList.add('hidden'); } }
function initializeHls() { if (hls) { hls.destroy(); } hls = new Hls(hlsConfig); addHlsEvents(); }

function loadVideo(videoUrl) {
    // This timeout is the original failsafe for non-MKV files
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
    const captureAndHoldFrame = () => { if (isPlaying && video.readyState > 2) { frameHoldCanvas.width = video.videoWidth; frameHoldCanvas.height = video.videoHeight; ctx.drawImage(video, 0, 0, frameHoldCanvas.width, frameHoldCanvas.height); frameHoldCanvas.classList.remove('invisible'); frameHoldCanvas.style.display = 'block'; } };
    const hideCanvasOnPlay = () => { video.addEventListener('playing', () => { frameHoldCanvas.classList.add('invisible'); setTimeout(() => { frameHoldCanvas.style.display = 'none'; }, 300); }, { once: true }); };
    if (url) {
        captureAndHoldFrame();
        initializeHls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hideCanvasOnPlay();
        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (qualityMenuBtn) { qualityMenuBtn.querySelector('.current-value').textContent = 'HD 1080p'; }
        qualityOptionsList.querySelectorAll('li').forEach(opt => opt.classList.remove('active', 'playing'));
        const new1080pOption = qualityOptionsList.querySelector('li[data-level="1080"]');
        if (new1080pOption) new1080pOption.classList.add('active');
        settingsBtn.classList.add('show-hd-badge');
        hls.once(Hls.Events.MANIFEST_PARSED, () => { video.currentTime = currentTime; if (isPlaying) video.play().catch(() => {}); });
    } else { hls.currentLevel = parseInt(level, 10); }
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
    if (subtitleCurrentValue) subtitleCurrentValue.textContent = activeTrack ? activeTrack.label : 'Off';
    showMenuPage(mainSettingsPage);
}

function directTogglePlay() { video.paused ? video.play() : video.pause(); }

function handleScreenTap() {
    if (settingsMenu.classList.contains('active')) {
        settingsMenu.classList.remove('active');
        settingsBtn.classList.remove('active');
        return;
    }
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
        try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (err) {}
    } else {
        await document.exitFullscreen();
        try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (err) {}
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
        menuContentWrapper.style.height = `${pageToShow.scrollHeight}px`;
    }, 0);
    if (currentPage && currentPage !== pageToShow) {
        if (pageToShow === mainSettingsPage) {
            currentPage.classList.remove('active');
            currentPage.classList.add('slide-out-right');
            mainSettingsPage.classList.remove('slide-out-left');
            mainSettingsPage.classList.add('active');
        } else {
            mainSettingsPage.classList.remove('active');
            mainSettingsPage.classList.add('slide-out-left');
            pageToShow.classList.remove('slide-out-right');
            pageToShow.classList.add('active');
        }
    }
}

function addHlsEvents() {
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => { /* Your original HLS manifest parsing code here */ });
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => { /* Your original HLS level switched code here */ });
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

// Event Listeners
video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);
video.addEventListener('play', () => { updatePlayState(); resetControlsTimer(); acquireWakeLock(); });
video.addEventListener('play', () => { if (video.poster) { video.poster = ''; } }, { once: true });
video.addEventListener('pause', () => { updatePlayState(); clearTimeout(controlsTimeout); playerContainer.classList.add('show-controls'); releaseWakeLock(); });
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
progressBar.addEventListener('mousedown', () => { isScrubbing = true; wasPlaying = !video.paused; if (wasPlaying) video.pause(); });
document.addEventListener('mouseup', () => { if (isScrubbing) { isScrubbing = false; if (wasPlaying) video.play(); } });
document.addEventListener('mousemove', () => { playerContainer.classList.add('show-controls'); resetControlsTimer(); });
settingsBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
    if (settingsMenu.classList.contains('active')) {
        [mainSettingsPage, speedSettingsPage, qualitySettingsPage, subtitleSettingsPage].filter(p => p).forEach(p => p.classList.remove('active', 'slide-out-left', 'slide-out-right'));
        mainSettingsPage.classList.add('active');
        menuContentWrapper.style.height = `${mainSettingsPage.scrollHeight}px`;
    }
});
speedMenuBtn.addEventListener('click', () => { showMenuPage(speedSettingsPage); });
if (subtitleMenuBtn) { subtitleMenuBtn.addEventListener('click', () => { showMenuPage(subtitleSettingsPage); }); }
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
    if (document.visibilityState === 'hidden' && wakeLock !== null) { releaseWakeLock(); }
    else if (document.visibilityState === 'visible' && !video.paused) { acquireWakeLock(); }
});

// ==========================================================
// === Main Logic on Page Load                            ===
// ==========================================================
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
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = '';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        }

        // --- Main Decision Logic ---
        if (videoUrl.toLowerCase().endsWith('.mkv')) {
            console.log("MKV file detected. Using ffmpeg.wasm player.");
            playMkvWithFfmpeg(videoUrl);
        } else {
            console.log("HLS or standard file detected. Using default player.");
            loadVideo(videoUrl);
        }
    } else {
        loadingOverlay.classList.remove('hidden');
        loadingMainText.textContent = "No video source found.";
    }

    // General event listeners
    video.addEventListener('loadedmetadata', updateProgressUI);
    video.addEventListener('loadedmetadata', setupSubtitles);
    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
});
