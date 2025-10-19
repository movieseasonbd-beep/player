// DOM Elements (এইচটিএমএল এলিমেন্টগুলো এখানে ধরা হয়েছে)
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

// সেটিংস মেনুর DOM এলিমেন্টস
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

let hls = new Hls();
let controlsTimeout;
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
progressBar.addEventListener('input', scrub);
progressBar.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    if (e.type === 'touchstart') {
        document.addEventListener('touchmove', scrub);
        document.addEventListener('touchend', endScrub);
    }
});
document.addEventListener('mouseup', (e) => {
    if (isScrubbing) {
        isScrubbing = false;
        if (wasPlaying) video.play();
    }
});
playerContainer.addEventListener('mousemove', () => {
    playerContainer.classList.add('show-controls');
    resetControlsTimer();
});

// === সেটিংস মেনুর নতুন ইভেন্ট লিসেনার ===
settingsBtn.addEventListener('click', () => {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
    if (settingsMenu.classList.contains('active')) {
        speedSettingsPage.classList.remove('active');
        qualitySettingsPage.classList.remove('active');
        mainSettingsPage.classList.add('active');
    }
});
speedMenuBtn.addEventListener('click', () => {
    mainSettingsPage.classList.remove('active');
    speedSettingsPage.classList.add('active');
});
backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        speedSettingsPage.classList.remove('active');
        qualitySettingsPage.classList.remove('active');
        mainSettingsPage.classList.add('active');
    });
});
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = parseFloat(option.dataset.speed);
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        speedCurrentValue.textContent = option.dataset.speed === '1' ? 'Normal' : `${option.dataset.speed}x`;
        speedSettingsPage.classList.remove('active');
        mainSettingsPage.classList.add('active');
    });
});

// ===== HLS কোয়ালিটি ম্যানেজমেন্ট কোড (গ্রুপ ডিজাইনের জন্য আপডেট করা) =====
hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
    if (data.levels.length > 1) {
        const qualityMenuBtn = document.createElement('li');
        qualityMenuBtn.innerHTML = `
            <div class="menu-item-label">
                <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path></svg>
                <span>Quality</span>
            </div>
            <div class="menu-item-value">
                <span class="current-value">Auto</span>
                <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg>
            </div>`;
        qualityMenuBtn.addEventListener('click', () => {
            mainSettingsPage.classList.remove('active');
            qualitySettingsPage.classList.add('active');
        });
        
        qualityOptionsList.innerHTML = '';
        const autoOption = document.createElement('li');
        autoOption.textContent = 'Auto';
        autoOption.dataset.level = -1;
        autoOption.classList.add('active');
        autoOption.addEventListener('click', () => setQuality(-1));
        qualityOptionsList.appendChild(autoOption);
        
        data.levels.forEach((level, index) => {
            const option = document.createElement('li');
            option.textContent = `${level.height}p`;
            option.dataset.level = index;
            option.addEventListener('click', () => setQuality(index));
            qualityOptionsList.appendChild(option);
        });
        
        playerSettingsGroup.prepend(qualityMenuBtn);
    }
});
hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
    const qualityMenuLi = playerSettingsGroup.querySelector('li:first-child');
    if (!qualityMenuLi || !qualityMenuLi.querySelector('.current-value')) return;

    const qualityCurrentValue = qualityMenuLi.querySelector('.current-value');
    const allQualityOptions = qualityOptionsList.querySelectorAll('li');
    
    allQualityOptions.forEach(opt => {
        opt.classList.remove('active');
        if (parseInt(opt.dataset.level) === data.level) {
            opt.classList.add('active');
            if(qualityCurrentValue) {
                qualityCurrentValue.textContent = hls.autoLevelEnabled ? `${opt.textContent.replace(' (Auto)', '')} (Auto)` : opt.textContent;
            }
        }
    });

    if (hls.autoLevelEnabled) {
         const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]');
         if (autoOpt) autoOpt.classList.add('active');
         if(qualityCurrentValue && !qualityCurrentValue.textContent.includes('(Auto)')) {
             qualityCurrentValue.textContent = 'Auto';
         }
    }
});
function setQuality(level) {
    hls.currentLevel = parseInt(level);
    qualitySettingsPage.classList.remove('active');
    mainSettingsPage.classList.add('active');
}

// === পেজ লোড হলে যা যা ঘটবে ===
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
