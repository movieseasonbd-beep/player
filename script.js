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
const aspectRatioBtn = document.getElementById('aspect-ratio-btn');
const aspectRatioText = aspectRatioBtn.querySelector('.aspect-ratio-text');

// জেসচার কন্ট্রোলের জন্য DOM Elements এবং Variables
const brightnessOverlay = document.querySelector('.brightness-overlay');
const fastForwardIndicator = document.querySelector('.fast-forward-indicator');
const volumeIndicator = document.getElementById('volume-indicator');
const brightnessIndicator = document.getElementById('brightness-indicator');
const volumeBarFill = document.getElementById('volume-bar-fill');
const brightnessBarFill = document.getElementById('brightness-bar-fill');
const gestureVolumeOnIcon = volumeIndicator.querySelector('.gesture-volume-on-icon');
const gestureVolumeOffIcon = volumeIndicator.querySelector('.gesture-volume-off-icon');
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
const SWIPE_THRESHOLD = 40;

let hls, controlsTimeout, isScrubbing = false, wasPlaying = false, qualityMenuInitialized = false, originalVideoUrl = null, wakeLock = null;
let lastVolume = 1;
const aspectModes = ['fit', 'stretch', 'crop'];
let currentAspectModeIndex = 0;

const hlsConfig = { maxBufferLength: 60, maxMaxBufferLength: 900, startLevel: -1, abrBandWidthFactor: 0.95, abrBandWidthUpFactor: 0.8, maxStarveDuration: 2, maxBufferHole: 0.5, };
const acquireWakeLock = async () => { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} } };
const releaseWakeLock = () => { if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); } };
function hideLoadingOverlay() { if (!loadingOverlay.classList.contains('hidden')) { loadingOverlay.classList.add('hidden'); } }

// ভিডিওর বর্তমান সময় localStorage-এ সেভ করার ফাংশন
function saveVideoProgress(videoId) {
    if (!video.duration || video.currentTime < 5) return;
    const progress = {
        time: video.currentTime,
        duration: video.duration
    };
    if ((progress.time / progress.duration) > 0.98) {
        localStorage.removeItem(videoId);
    } else {
        localStorage.setItem(videoId, JSON.stringify(progress));
    }
}

// localStorage থেকে সেভ করা সময় লোড করার ফাংশন
function loadVideoProgress(videoId) {
    const savedProgressJSON = localStorage.getItem(videoId);
    if (savedProgressJSON) {
        const savedProgress = JSON.parse(savedProgressJSON);
        if (video.duration && Math.abs(video.duration - savedProgress.duration) < 5) {
             video.currentTime = savedProgress.time;
             console.log(`Resuming video from ${formatTime(savedProgress.time)}`);
        }
    }
}

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
    for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        track.mode = (track.language === lang) ? 'showing' : 'hidden';
    }
    subtitleOptionsList.querySelectorAll('li').forEach(opt => { opt.classList.toggle('active', opt.dataset.lang === lang); });
    const activeTrack = [...textTracks].find(t => t.mode === 'showing');
    if(subtitleCurrentValue) subtitleCurrentValue.textContent = activeTrack ? activeTrack.label : 'Off';
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
        video.volume = 0;
    } else {
        video.muted = false;
        video.volume = 1.0;
        lastVolume = 1.0;
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
    if (!isFullscreen) {
        currentAspectModeIndex = 0;
        updateAspectRatio(aspectModes[currentAspectModeIndex]);
    }
}

function showMenuPage(pageToShow) {
    const currentPage = menuContentWrapper.querySelector('.menu-page.active');
    setTimeout(() => { menuContentWrapper.style.height = `${pageToShow.scrollHeight}px`; }, 0);
    if (currentPage && currentPage !== pageToShow) {
        if (pageToShow === mainSettingsPage) { currentPage.classList.remove('active'); currentPage.classList.add('slide-out-right'); mainSettingsPage.classList.remove('slide-out-left'); mainSettingsPage.classList.add('active'); } else { mainSettingsPage.classList.remove('active'); mainSettingsPage.classList.add('slide-out-left'); pageToShow.classList.remove('slide-out-right'); pageToShow.classList.add('active'); }
    }
}

function updateAspectRatio(mode) {
    switch (mode) {
        case 'stretch':
            video.style.objectFit = 'fill';
            break;
        case 'crop':
            video.style.objectFit = 'cover';
            break;
        case 'fit':
        default:
            video.style.objectFit = 'contain';
            break;
    }
    aspectRatioText.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    aspectRatioBtn.className = 'control-btn';
    aspectRatioBtn.classList.add(mode);
}

function addHlsEvents() {
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => { if (qualityMenuInitialized) return; const urlParams = new URLSearchParams(window.location.search); const videoUrl = urlParams.get('id'); if (data.levels.length > 0) { const qualityMenuBtn = document.getElementById('quality-menu-btn') || document.createElement('li'); qualityMenuBtn.id = 'quality-menu-btn'; qualityMenuBtn.innerHTML = `<div class="menu-item-label"> <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216,104H102.09L210,75.51a8,8,0,0,0,5.68-9.84l-8.16-30a15.93,15.93,0,0,0-19.42-11.13L35.81,64.74a15.75,15.75,0,0,0-9.7,7.4,15.51,15.51,0,0,0-1.55,12L32,111.56c0,.14,0,.29,0,.44v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V112A8,8,0,0,0,216,104ZM192.16,40l6,22.07L164.57,71,136.44,54.72ZM77.55,70.27l28.12,16.24-59.6,15.73-6-22.08Z"></path></svg> <span>Quality</span> </div> <div class="menu-item-value"> <span class="current-value">Auto</span> <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg> </div>`; qualityMenuBtn.addEventListener('click', () => { showMenuPage(qualitySettingsPage); }); qualityOptionsList.innerHTML = ''; const autoOption = document.createElement('li'); autoOption.textContent = 'Auto'; autoOption.dataset.level = -1; autoOption.classList.add('active'); autoOption.addEventListener('click', () => setQuality(-1)); qualityOptionsList.appendChild(autoOption); data.levels.forEach((level, index) => { const option = document.createElement('li'); option.textContent = (level.height >= 1080) ? `HD ${level.height}p` : `${level.height}p`; option.dataset.level = index; option.addEventListener('click', () => setQuality(index)); qualityOptionsList.appendChild(option); }); if (!document.getElementById('quality-menu-btn')) { playerSettingsGroup.prepend(qualityMenuBtn); } const manifestHas1080p = data.levels.some(level => level.height >= 1080); if (!manifestHas1080p) { try { const currentUrl = new URL(videoUrl); const pathSegments = currentUrl.pathname.split('/'); const lastSegmentIndex = pathSegments.findLastIndex(seg => seg.includes('.m3u8')); if (lastSegmentIndex > -1) { let segments1080 = [...pathSegments]; segments1080.splice(lastSegmentIndex, 0, '1080'); const potential1080pUrl = currentUrl.origin + segments1080.join('/') + currentUrl.search; fetch(potential1080pUrl, { method: 'HEAD' }).then(response => { if (response.ok) { const option1080p = document.createElement('li'); option1080p.textContent = 'HD 1080p'; option1080p.dataset.level = '1080'; option1080p.addEventListener('click', () => setQuality('1080', potential1080pUrl)); qualityOptionsList.appendChild(option1080p); } }); } } catch (e) {} } } qualityMenuInitialized = true; });
    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => { const qualityMenuBtn = document.getElementById('quality-menu-btn'); if (!qualityMenuBtn) return; const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value'); const allQualityOptions = qualityOptionsList.querySelectorAll('li'); allQualityOptions.forEach(opt => opt.classList.remove('active', 'playing')); if (hls.url !== originalVideoUrl) { qualityCurrentValue.textContent = 'HD 1080p'; const external1080pOption = qualityOptionsList.querySelector('li[data-level="1080"]'); if (external1080pOption) external1080pOption.classList.add('active'); settingsBtn.classList.add('show-hd-badge'); return; } const activeLevel = hls.levels[data.level]; if (!activeLevel) { qualityCurrentValue.textContent = hls.autoLevelEnabled ? 'Auto' : '...'; const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]'); if (autoOpt) autoOpt.classList.add('active'); settingsBtn.classList.remove('show-hd-badge'); return; } if (hls.autoLevelEnabled) { qualityCurrentValue.textContent = `${activeLevel.height}p (Auto)`; const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]'); if (autoOpt) autoOpt.classList.add('active'); const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`); if (currentPlayingOpt) currentPlayingOpt.classList.add('playing'); } else { qualityCurrentValue.textContent = (activeLevel.height >= 1080) ? `HD 1080p` : `${activeLevel.height}p`; const currentSelectedOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`); if (currentSelectedOpt) currentSelectedOpt.classList.add('active'); } if (activeLevel.height >= 1080) { settingsBtn.classList.add('show-hd-badge'); if (hls.autoLevelEnabled) { qualityCurrentValue.textContent = 'HD 1080p (Auto)'; } } else { settingsBtn.classList.remove('show-hd-badge'); } });
    hls.on(Hls.Events.ERROR, function(event, data) { if (data.fatal) { switch (data.type) { case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break; case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break; default: hls.destroy(); break; } } });
}

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

    if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
        return;
    }

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

aspectRatioBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) return;
    currentAspectModeIndex = (currentAspectModeIndex + 1) % aspectModes.length;
    const newMode = aspectModes[currentAspectModeIndex];
    updateAspectRatio(newMode);
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
    const isHlsStream = Hls.isSupported() && videoUrl && videoUrl.includes('.m3u8');
    const subtitleUrl = urlParams.get('sub');
    const downloadUrl = urlParams.get('download');
    const posterUrl = urlParams.get('poster');
    originalVideoUrl = videoUrl;

    if (videoUrl) {
        if (posterUrl) video.poster = posterUrl;
        if (subtitleUrl && subtitleMenuBtn) { const subtitleTrack = document.createElement('track'); subtitleTrack.kind = 'subtitles'; subtitleTrack.srclang = 'bn'; subtitleTrack.label = 'বাংলা'; subtitleTrack.src = subtitleUrl; subtitleTrack.default = true; video.appendChild(subtitleTrack); }
        if (downloadUrl && downloadBtn) { downloadBtn.style.display = 'flex'; downloadBtn.addEventListener('click', () => { const a = document.createElement('a'); a.href = downloadUrl; a.download = ''; document.body.appendChild(a); a.click(); document.body.removeChild(a); }); }
        
        loadVideo(videoUrl);
        
        // m3u8 স্ট্রিম না হলেই শুধুমাত্র এই ফিচার কাজ করবে
        if (!isHlsStream) {
            console.log("Not an HLS stream, enabling Resume Playback.");
            // প্রতি ১০ সেকেন্ড পর পর ভিডিওর সময় সেভ করা হবে
            setInterval(() => {
                saveVideoProgress(videoUrl);
            }, 10000); 

            // ব্যবহারকারী পেজ বন্ধ করলে বা অন্য পেজে গেলে সময় সেভ হবে
            window.addEventListener('beforeunload', () => {
                saveVideoProgress(videoUrl);
            });
        }

    } else {
        loadingOverlay.classList.remove('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }

    video.addEventListener('loadedmetadata', updateProgressUI);
    video.addEventListener('loadedmetadata', setupSubtitles);
    video.addEventListener('loadedmetadata', () => {
        // m3u8 স্ট্রিম না হলেই শুধুমাত্র সেভ করা সময় লোড হবে
        if (videoUrl && !isHlsStream) {
            loadVideoProgress(videoUrl);
        }
    });

    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
    updateAspectRatio(aspectModes[currentAspectModeIndex]);

    updateVolumeGestureIcon(video.volume);
    updateBrightnessGestureIcon(currentBrightness);
});
