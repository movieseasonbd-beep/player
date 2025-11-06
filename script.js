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

// জেসচার কন্ট্রোলের জন্য DOM Elements এবং Variables
const brightnessOverlay = document.querySelector('.brightness-overlay');
const fastForwardIndicator = document.querySelector('.fast-forward-indicator');
const volumeIndicator = document.getElementById('volume-indicator');
const brightnessIndicator = document.getElementById('brightness-indicator');
const volumeBarFill = document.getElementById('volume-bar-fill');
const brightnessBarFill = document.getElementById('brightness-bar-fill');

// পরিবর্তিত: নতুন জেসচার ভলিউম আইকন
const gestureVolumeOnIcon = volumeIndicator.querySelector('.volume-on-icon');
const gestureVolumeOffIcon = volumeIndicator.querySelector('.volume-off-icon');

const brightnessIconLow = brightnessIndicator.querySelector('.brightness-icon-low');
const brightnessIconMedium = brightnessIndicator.querySelector('.brightness-icon-medium');
const brightnessIconHigh = brightnessIndicator.querySelector('.brightness-icon-high');

let touchStartX, touchStartY;
let isTouching = false;
let initialVolume, initialBrightness;
let longPressTimer;
let isFastForwarding = false;
let originalPlaybackRate = 1;
let indicatorTimeout;
let currentBrightness = 1.0; 
let hls, controlsTimeout, isScrubbing = false, wasPlaying = false, qualityMenuInitialized = false, originalVideoUrl = null, wakeLock = null;
let lastVolume = 1; // পরিবর্তিত: আনমিউট করার জন্য শেষ ভলিউম মনে রাখবে

const hlsConfig = { maxBufferLength: 60, maxMaxBufferLength: 900, startLevel: -1, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.8, maxStarveDuration: 2, maxBufferHole: 0.5, };
const acquireWakeLock = async () => { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} } };
const releaseWakeLock = () => { if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); } };
function hideLoadingOverlay() { if (!loadingOverlay.classList.contains('hidden')) { loadingOverlay.classList.add('hidden'); } }

function initializeHls() {
    if (hls) { hls.destroy(); }
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
    } else {
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
    for (let i = 0; i < textTracks.length; i++) { const track = textTracks[i]; track.mode = (track.language === lang) ? 'showing' : 'hidden'; }
    subtitleOptionsList.querySelectorAll('li').forEach(opt => { opt.classList.toggle('active', opt.dataset.lang === lang); });
    const activeTrack = [...textTracks].find(t => t.mode === 'showing');
    if(subtitleCurrentValue) subtitleCurrentValue.textContent = activeTrack ? activeTrack.label : 'Off';
    showMenuPage(mainSettingsPage);
}

function directTogglePlay() { video.paused ? video.play() : video.pause(); }

function handleScreenTap() {
    if (settingsMenu.classList.contains('active')) { settingsMenu.classList.remove('active'); settingsBtn.classList.remove('active'); return; }
    const isControlsVisible = getComputedStyle(controlsContainer).opacity === '1';
    if (video.paused) { video.play(); } else {
        if (isControlsVisible) { video.pause(); } else { playerContainer.classList.add('show-controls'); resetControlsTimer(); }
    }
}

function updatePlayState() {
    const isPaused = video.paused;
    playPauseBtn.querySelector('.play-icon').style.display = isPaused ? 'block' : 'none';
    playPauseBtn.querySelector('.pause-icon').style.display = isPaused ? 'none' : 'block';
    playerContainer.classList.toggle('paused', isPaused);
    playerContainer.classList.toggle('playing', !isPaused);
}

function hideControls() { if (!video.paused && !settingsMenu.classList.contains('active') && !isScrubbing) { playerContainer.classList.remove('show-controls'); } }
function resetControlsTimer() { clearTimeout(controlsTimeout); controlsTimeout = setTimeout(hideControls, 3000); }

function updateProgressUI() {
    if (isScrubbing) return;
    if (video.duration && !isNaN(video.duration)) {
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = progressPercent;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
}

function updateBufferBar() { if (video.duration > 0 && video.buffered.length > 0) { const bufferEnd = video.buffered.end(video.buffered.length - 1); bufferBar.style.width = `${(bufferEnd / video.duration) * 100}%`; } }

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

function toggleMute() {
    if (video.volume > 0 && !video.muted) {
        lastVolume = video.volume;
        video.muted = true;
        video.volume = 0; // Ensure consistency
    } else {
        video.muted = false;
        if (video.volume === 0) {
            video.volume = lastVolume;
        }
    }
    requestAnimationFrame(updateVolumeIcon);
}

function updateVolumeIcon() {
    const isMuted = video.muted || video.volume === 0;
    volumeBtn.querySelector('.volume-on-icon').style.display = isMuted ? 'none' : 'block';
    volumeBtn.querySelector('.volume-off-icon').style.display = isMuted ? 'block' : 'none';
    volumeBtn.classList.toggle('active', isMuted);
}

async function toggleFullscreen() {
    if (!document.fullscreenElement) { await playerContainer.requestFullscreen(); try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (err) {} } else { await document.exitFullscreen(); try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (err) {} }
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
    setTimeout(() => { menuContentWrapper.style.height = `${pageToShow.scrollHeight}px`; }, 0);
    if (currentPage && currentPage !== pageToShow) {
        if (pageToShow === mainSettingsPage) { currentPage.classList.remove('active'); currentPage.classList.add('slide-out-right'); mainSettingsPage.classList.remove('slide-out-left'); mainSettingsPage.classList.add('active'); } else { mainSettingsPage.classList.remove('active'); mainSettingsPage.classList.add('slide-out-left'); pageToShow.classList.remove('slide-out-right'); pageToShow.classList.add('active'); }
    }
}

function addHlsEvents() {
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => { if (qualityMenuInitialized) return; const urlParams = new URLSearchParams(window.location.search); const videoUrl = urlParams.get('id'); if (data.levels.length > 0) { const qualityMenuBtn = document.getElementById('quality-menu-btn') || document.createElement('li'); qualityMenuBtn.id = 'quality-menu-btn'; qualityMenuBtn.innerHTML = `<div class="menu-item-label"> <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216,104H102.09L210,75.51a8,8,0,0,0,5.68-9.84l-8.16-30a15.93,15.93,0,0,0-19.42-11.13L35.81,64.74a15.75,15.75,0,0,0-9.7,7.4,15.51,15.51,0,0,0-1.55,12L32,111.56c0,.14,0,.29,0,.44v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V112A8,8,0,0,0,216,104ZM192.16,40l6,22.07L164.57,71,136.44,54.72ZM77.55,70.27l28.12,16.24-59.6,15.73-6-22.08Z"></path></svg> <span>Quality</span> </div> <div class="menu-item-value"> <span class="current-value">Auto</span> <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg> </div>`; qualityMenuBtn.addEventListener('click', () => { showMenuPage(qualitySettingsPage); }); qualityOptionsList.innerHTML = ''; const autoOption = document.createElement('li'); autoOption.textContent = 'Auto'; autoOption.dataset.level = -1; autoOption.classList.add('active'); autoOption.addEventListener('click', () => setQuality(-1)); qualityOptionsList.appendChild(autoOption); data.levels.forEach((level, index) => { const option = document.createElement('li'); option.textContent = (level.height >= 1080) ? `HD ${level.height}p` : `${level.height}p`; option.dataset.level = index; option.addEventListener('click', () => setQuality(index)); qualityOptionsList.appendChild(option); }); if (!document.getElementById('quality-menu-btn')) { playerSettingsGroup.prepend(qualityMenuBtn); } const manifestHas1080p = data.levels.some(level => level.height >= 1080); if (!manifestHas1080p) { try { const currentUrl = new URL(videoUrl); const pathSegments = currentUrl.pathname.split('/'); const lastSegmentIndex = pathSegments.findLastIndex(seg => seg.includes('.m3u8')); if (lastSegmentIndex > -1) { let segments1080 = [...pathSegments]; segments1080.splice(lastSegmentIndex, 0, '1080'); const potential1080pUrl = currentUrl.origin + segments1080.join('/') + currentUrl.search; fetch(potential1080pUrl, { method: 'HEAD' }).then(response => { if (response.ok) { const option1080p = document.createElement('li'); option1080p.textContent = 'HD 1080p'; option1080p.dataset.level = '1080'; option1080p.addEventListener('click', () => setQuality('1080', potential1080pUrl)); qualityOptionsList.appendChild(option1080p); } }); } } catch (e) {} } } qualityMenuInitialized = true; });
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => { const qualityMenuBtn = document.getElementById('quality-menu-btn'); if (!qualityMenuBtn) return; const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value'); const allQualityOptions = qualityOptionsList.querySelectorAll('li'); allQualityOptions.forEach(opt => opt.classList.remove('active', 'playing')); if (hls.url !== originalVideoUrl) { qualityCurrentValue.textContent = 'HD 1080p'; const external1080pOption = qualityOptionsList.querySelector('li[data-level="1080"]'); if (external1080pOption) external1080pOption.classList.add('active'); settingsBtn.classList.add('show-hd-badge'); return; } const activeLevel = hls.levels[data.level]; if (!activeLevel) { qualityCurrentValue.textContent = hls.autoLevelEnabled ? 'Auto' : '...'; const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]'); if (autoOpt) autoOpt.classList.add('active'); settingsBtn.classList.remove('show-hd-badge'); return; } if (hls.autoLevelEnabled) { qualityCurrentValue.textContent = `${activeLevel.height}p (Auto)`; const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]'); if (autoOpt) autoOpt.classList.add('active'); const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`); if (currentPlayingOpt) currentPlayingOpt.classList.add('playing'); } else { qualityCurrentValue.textContent = (activeLevel.height >= 1080) ? `HD 1080p` : `${activeLevel.height}p`; const currentSelectedOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`); if (currentSelectedOpt) currentSelectedOpt.classList.add('active'); } if (activeLevel.height >= 1080) { settingsBtn.classList.add('show-hd-badge'); if (hls.autoLevelEnabled) { qualityCurrentValue.textContent = 'HD 1080p (Auto)'; } } else { settingsBtn.classList.remove('show-hd-badge'); } });
    hls.on(Hls.Events.ERROR, function(event, data) { if (data.fatal) { switch (data.type) { case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break; case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break; default: hls.destroy(); break; } } });
}

// === নতুন ও পরিবর্তিত: জেসচার কন্ট্রোল ফাংশন ===

// পরিবর্তিত: জেসচার ভলিউম আইকন আপডেট করার নতুন ফাংশন
function updateVolumeGestureIcon(level) {
    if (level === 0) {
        gestureVolumeOnIcon.style.display = 'none';
        gestureVolumeOffIcon.style.display = 'block';
    } else {
        gestureVolumeOnIcon.style.display = 'block';
        gestureVolumeOffIcon.style.display = 'none';
    }
}

function updateBrightnessGestureIcon(level) {
    [brightnessIconLow, brightnessIconMedium, brightnessIconHigh].forEach(icon => icon.style.display = 'none');
    if (level <= 0.33) { brightnessIconHigh.style.display = 'block'; }
    else if (level <= 0.66) { brightnessIconMedium.style.display = 'block'; }
    else { brightnessIconLow.style.display = 'block'; }
}

function showIndicator(indicator) {
    clearTimeout(indicatorTimeout);
    [volumeIndicator, brightnessIndicator, fastForwardIndicator].forEach(ind => { if (ind !== indicator) ind.classList.remove('show'); });
    indicator.classList.add('show');
}

function hideIndicators() { indicatorTimeout = setTimeout(() => { volumeIndicator.classList.remove('show'); brightnessIndicator.classList.remove('show'); }, 800); }
function startFastForward() { if (video.paused) return; isFastForwarding = true; originalPlaybackRate = video.playbackRate; video.playbackRate = 2.0; showIndicator(fastForwardIndicator); }
function endFastForward() { if (!isFastForwarding) return; video.playbackRate = originalPlaybackRate; fastForwardIndicator.classList.remove('show'); isFastForwarding = false; }

function handleTouchStart(e) {
    if (!document.fullscreenElement || e.target.closest('.controls-container')) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;
    initialVolume = video.volume;
    initialBrightness = currentBrightness;
    brightnessBarFill.style.width = `${initialBrightness * 100}%`;
    volumeBarFill.style.width = `${initialVolume * 100}%`;
    updateVolumeGestureIcon(initialVolume);
    updateBrightnessGestureIcon(initialBrightness);
    if (touchStartX > window.innerWidth / 2) { longPressTimer = setTimeout(startFastForward, 200); }
}

function handleTouchMove(e) {
    if (!isTouching || !document.fullscreenElement) return;
    clearTimeout(longPressTimer);
    if (isFastForwarding) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaY = touchStartY - touch.clientY;
    const swipeSensitivity = window.innerHeight * 0.7;

    if (touchStartX < window.innerWidth / 2) {
        let newVolume = initialVolume + (deltaY / swipeSensitivity);
        newVolume = Math.max(0, Math.min(1, newVolume));
        if (newVolume > 0) {
            lastVolume = newVolume;
        }
        video.volume = newVolume;
        video.muted = newVolume === 0;
        volumeBarFill.style.width = `${newVolume * 100}%`;
        updateVolumeGestureIcon(newVolume);
        showIndicator(volumeIndicator);
        updateVolumeIcon();
    } else {
        let newBrightness = initialBrightness + (deltaY / swipeSensitivity);
        newBrightness = Math.max(0, Math.min(1, newBrightness));
        currentBrightness = newBrightness;
        brightnessOverlay.style.opacity = 1 - currentBrightness;
        brightnessBarFill.style.width = `${currentBrightness * 100}%`;
        updateBrightnessGestureIcon(newBrightness);
        showIndicator(brightnessIndicator);
    }
}

function handleTouchEnd(e) {
    if (!isTouching) return;
    clearTimeout(longPressTimer);
    if (isFastForwarding) { endFastForward(); } else { hideIndicators(); }
    isTouching = false;
}

// Event Listeners
video.addEventListener('click', handleScreenTap);
video.addEventListener('contextmenu', e => e.preventDefault());
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

playerContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
playerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
playerContainer.addEventListener('touchend', handleTouchEnd);
playerContainer.addEventListener('touchcancel', handleTouchEnd);

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
    if (document.visibilityState === 'hidden' && wakeLock !== null) { releaseWakeLock(); } else if (document.visibilityState === 'visible' && !video.paused) { acquireWakeLock(); }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    const subtitleUrl = urlParams.get('sub');
    const downloadUrl = urlParams.get('download');
    const posterUrl = urlParams.get('poster');
    originalVideoUrl = videoUrl;

    if (videoUrl) {
        if (posterUrl) video.poster = posterUrl;
        if (subtitleUrl && subtitleMenuBtn) { const subtitleTrack = document.createElement('track'); subtitleTrack.kind = 'subtitles'; subtitleTrack.srclang = 'bn'; subtitleTrack.label = 'বাংলা'; subtitleTrack.src = subtitleUrl; subtitleTrack.default = true; video.appendChild(subtitleTrack); }
        if (downloadUrl && downloadBtn) { downloadBtn.style.display = 'flex'; downloadBtn.addEventListener('click', () => { const a = document.createElement('a'); a.href = downloadUrl; a.download = ''; document.body.appendChild(a); a.click(); document.body.removeChild(a); }); }
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
    
    updateVolumeGestureIcon(video.volume);
    updateBrightnessGestureIcon(currentBrightness);
});```

### `style.css` (অপরিবর্তিত)
এই ফাইলটিতে কোনো পরিবর্তনের প্রয়োজন নেই। আপনার আগের কোডটিই ঠিকভাবে কাজ করবে।

```css
:root {
    --theme-color: #f21111;
    --theme-color-darker: #e33939;
    --progress-bar-height: 5px;
    --thumb-size: 16px;
    --central-play-btn-color: #fa0505;
    --gradient-start-color: #cf0000;
    --gradient-end-color: #f16d0f;
    --loading-theme-color: #ff0000;
    --loading-gradient-start: #ff0000;
    --loading-gradient-end: #ff7e7e;
}

body {
    margin: 0;
    background-color: #000;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: white;
    overflow: hidden;
}

.player-container {
    width: 100vw;
    height: 100vh;
    position: relative;
    background-color: #000;
    display: flex;
    justify-content: center;
    align-items: center;
}

.player-container.playing .central-play-btn {
    opacity: 0;
    visibility: hidden;
}

.player-container.paused .controls-container,
.player-container.show-controls .controls-container {
    opacity: 1;
    transform: translateY(0);
}

.video {
    width: 100%;
    height: 100%;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    object-fit: contain;
    background-color: #000;
}

#frame-hold-canvas {
    display: none;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    background-color: #000;
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
    object-fit: contain;
}

#frame-hold-canvas.invisible {
    opacity: 0;
}

.loading-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #000; display: flex; justify-content: center; align-items: center; z-index: 10; transition: opacity 0.5s ease, visibility 0.5s ease; }
.loading-overlay.hidden { opacity: 0; visibility: hidden; }
.loading-content { text-align: center; }
.loading-logo { font-family: 'Arial', sans-serif; font-size: 22px; font-weight: 900; margin-bottom: 6px; letter-spacing: 0.5px; background: linear-gradient(to right, var(--loading-gradient-start), var(--loading-gradient-end)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.loading-bar-container { width: 220px; height: 2px; margin: 0 auto 18px auto; position: relative; }
.loading-bar { width: 100%; height: 100%; background-image: linear-gradient(to right, transparent, white, transparent), linear-gradient(to right, transparent, var(--gradient-start-color) 45%, var(--gradient-end-color) 55%, transparent ); background-size: 40% 100%, 100% 100%; background-repeat: no-repeat; background-blend-mode: screen; animation: loading-scan-final 3.2s infinite linear; clip-path: polygon(0% 50%, 5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%); }
@keyframes loading-scan-final { 0% { background-position: 10% 0, 0 0; } 100% { background-position: 90% 0, 0 0; } }
.loading-text { font-size: 10px; letter-spacing: 0.5px; }
.loading-maintext { color: white; }
.loading-subtext { background: linear-gradient(to right, var(--loading-gradient-start), var(--loading-gradient-end)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.central-play-btn { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2; cursor: pointer; transition: all 0.2s ease; background: none; width: auto; height: auto; }
.central-play-btn:hover { transform: translate(-50%, -50%) scale(1.1); }
.central-play-btn:active { transform: translate(-50%, -50%) scale(1.0); }
.central-play-btn svg { width: 80px; height: 80px; fill: none; filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.7)); }

.controls-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    padding: 10px 25px;
    background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
    z-index: 4;
    opacity: 0;
    transform: translateY(100%);
    transition: opacity 0.25s ease, transform 0.25s ease;
    will-change: transform, opacity;
}
.progress-range { display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr; align-items: center; width: 100%; padding: 2px 0; cursor: pointer; position: relative; }
.progress-background, .buffer-bar, .progress-filled, .progress-bar { grid-column: 1; grid-row: 1; }
.progress-background, .buffer-bar, .progress-filled { height: var(--progress-bar-height); border-radius: 5px; pointer-events: none; }
.progress-background { background: rgba(255, 255, 255, 0.2); }
.buffer-bar { background: rgba(255, 255, 255, 0.4); width: 0; transition: width 0.1s linear; }
.progress-filled { background: linear-gradient(to right, var(--gradient-start-color), var(--gradient-end-color)); width: 0; }
.progress-bar { -webkit-appearance: none; appearance: none; width: 100%; background: transparent; outline: none; margin: 0; padding: 0; z-index: 2; }
.progress-bar::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: var(--thumb-size); height: var(--thumb-size); background: white; border-radius: 50%; cursor: pointer; }
.control-group { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 5px; }
.controls-left, .controls-right { display: flex; align-items: center; gap: 20px; }
.control-btn { background: none; border: none; color: white; cursor: pointer; padding: 0; transition: transform 0.1s ease, color 0.1s ease; position: relative; display: flex; align-items: center; justify-content: center; }
.control-btn:hover { color: var(--theme-color); }
.control-btn:active { transform: scale(1); }
.control-btn.active { color: var(--theme-color); }

.control-btn svg path { fill: white; }
.control-btn:hover svg path { fill: var(--theme-color); }
.control-btn.active svg path { fill: var(--theme-color); }
.control-btn svg { transition: fill 0.1s ease; }
#fullscreen-btn .fullscreen-on-icon path { stroke: white; fill: none; }
#fullscreen-btn:hover .fullscreen-on-icon path { stroke: var(--theme-color); }

#play-pause-btn svg { width: 30px; height: 30px; }
#play-pause-btn { transform: translateX(-9px); }
#rewind-btn svg, #forward-btn svg, #volume-btn svg, #settings-btn svg { width: 24px; height: 24px; }
#forward-btn { transform: translateX(-8px); }
#rewind-btn { transform: translateX(-8px); }
#settings-btn { transform: translateX(+8px); }
#fullscreen-btn svg { width: 24px; height: 24px; }
#fullscreen-btn { transform: translateX(+4px); }
.time-display { font-size: 11px; user-select: none; margin-left: -11px; white-space: nowrap; }
#fullscreen-btn .tooltip { position: absolute; bottom: 150%; left: 50%; transform: translateX(-50%); background-color: rgba(0,0,0,0.8); color: white; padding: 5px 10px; border-radius: 5px; font-size: 14px; white-space: nowrap; opacity: 0; visibility: hidden; transition: opacity 0.2s ease; }
#fullscreen-btn:hover .tooltip { opacity: 1; visibility: visible; }

.hd-badge { position: absolute; top: -2px; right: -4px; background-color: var(--theme-color); color: white; font-size: 8px; font-weight: 700; padding: 1.5px 3.5px; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1; pointer-events: none; display: none; }
#settings-btn.show-hd-badge .hd-badge { display: block; }

.settings-menu { position: absolute; top: 50%; left: 50%; width: 240px; background: linear-gradient(to top right, #1f1f1f, #050505); border: 1px solid #3a3a3a; border-radius: 16px; opacity: 0; visibility: hidden; transform: translate(-50%, -45%) scale(0.95); transition: opacity 0.2s ease, transform 0.2s ease; padding: 8px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5); z-index: 5; will-change: transform, opacity; }
.settings-menu.active { opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1); }
.menu-handle-container { width: 100%; padding: 2px 0 6px 0; display: flex; justify-content: center; }
.menu-handle { width: 35px; height: 4px; background-color: #4d4d4d; border-radius: 10px; }
.menu-content-wrapper { position: relative; overflow: hidden; transition: height 0.2s ease-in-out; }
.menu-page { position: absolute; top: 0; left: 0; width: 100%; background-color: transparent; transform: translateX(100%); transition: transform 0.2s ease-in-out; }
.menu-page.active { position: relative; transform: translateX(0); }
.menu-page.slide-out-left { transform: translateX(-100%); }
.menu-page.slide-out-right { transform: translateX(100%); }

.menu-main ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.menu-main li { display: flex; justify-content: space-between; align-items: center; padding: 12px; font-size: 14px; color: #f1f1f1; cursor: pointer; background-color: #2c2c2c; border-radius: 12px; transition: background-color 0.2s ease; }
.menu-main li:hover { background-color: #3f3f3f; }
.menu-item-label, .menu-item-value { display: flex; align-items: center; gap: 10px; }
.menu-item-label svg { width: 20px; height: 20px; fill: #e0e0e0; }
.menu-item-value .current-value { color: #a0a0a0; font-size: 13px; }
.menu-item-value .arrow-right { width: 20px; height: 20px; fill: #a0a0a0; }
.menu-page .menu-header { display: flex; align-items: center; margin-bottom: 2px; font-size: 15px; font-weight: bold; padding: 2px 0; color: #f1f1f1; }
.menu-page .back-btn { background: none; border: none; color: white; cursor: pointer; padding: 0 10px 0 0; margin-left: -5px; }
.menu-page .back-btn svg { width: 24px; height: 24px; fill: white; }
.menu-speed ul, .menu-quality ul { list-style: none; margin: 0; padding: 0; }
.menu-speed li, .menu-quality li { display: flex !important; justify-content: flex-start !important; padding: 8px 11px; cursor: pointer; border-radius: 8px; transition: background-color 0.2s ease; font-size: 14px; color: #f1f1f1; }
.menu-speed li:hover, .menu-quality li:hover { background-color: rgba(255, 255, 255, 0.1); }
.menu-speed li.active, .menu-quality li.active { color: var(--theme-color); font-weight: bold; }
.menu-main ul, .menu-speed ul, .menu-quality ul { overflow-y: auto; }
.settings-menu ul::-webkit-scrollbar { width: 6px; }
.settings-menu ul::-webkit-scrollbar-track { background: transparent; }
.settings-menu ul::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 10px; }
.settings-menu ul::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }

.player-container, .player-container * { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
.player-container input[type="range"] { -webkit-user-select: auto; -moz-user-select: auto; -ms-user-select: auto; user-select: auto; }

#quality-options-list, #speed-options-list { min-height: 110px; max-height: 130px; }
@media (min-width: 768px) { #quality-options-list, #speed-options-list { max-height: none; } }
.menu-quality li.playing { color: #f21111; font-weight: bold; }

/* === নতুন ও পরিবর্তিত: জেসচার কন্ট্রোলের জন্য স্টাইল === */
.brightness-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000;
    opacity: 0;
    pointer-events: none;
    z-index: 3;
    transition: opacity 0.15s linear;
}

.fast-forward-indicator,
.gesture-indicator {
    position: absolute;
    top: 7vh;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(40, 40, 40, 0.85);
    color: white;
    border-radius: 20px;
    z-index: 4;
    display: flex;
    align-items: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
    pointer-events: none;
}

.fast-forward-indicator {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
}

.gesture-indicator {
    padding: 8px;
    gap: 10px;
}

.icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-left: 4px;
}

.gesture-indicator .indicator-icon {
    width: 20px;
    height: 20px;
    fill: #e0e0e0;
    display: none;
}

.indicator-bar-container {
    width: 120px;
    height: 5px;
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 10px;
    overflow: hidden;
    margin-right: 12px;
}

.indicator-bar-fill {
    height: 100%;
    width: 50%;
    background-color: white;
    border-radius: 10px;
    transition: width 0.05s linear;
}

.gesture-indicator.show,
.fast-forward-indicator.show {
    opacity: 1;
    visibility: visible;
}
/* ======================================= */
