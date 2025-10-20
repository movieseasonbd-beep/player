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

let hls = new Hls();
let controlsTimeout;
let isScrubbing = false;
let wasPlaying = false;

// ==========================================================
// === ফাংশনসমূহ ===
// ==========================================================
function loadVideo(videoUrl) {
    const hideLoadingScreen = () => {
        if (!loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
    };

    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        setupHls(videoUrl);
        hls.on(Hls.Events.FRAG_BUFFERED, function(event, data) {
            hls.off(Hls.Events.FRAG_BUFFERED);
            hideLoadingScreen();
        });
    } else {
        video.src = videoUrl;
        video.addEventListener('canplay', hideLoadingScreen, { once: true });
    }
    setTimeout(hideLoadingScreen, 2500);
}

// ==========================================================
// === HLS.js সেটআপ এবং এরর হ্যান্ডলিং (চূড়ান্ত সংস্করণ) ===
// ==========================================================
function setupHls(videoUrl) {
    if (hls) {
        hls.destroy();
    }
    
    // রিডাইরেক্ট এবং এরর হ্যান্ডলিং এর জন্য নতুন কনফিগারেশন
    const hlsConfig = {
        // এরর হলে সর্বোচ্চ ৫ বার রিকভার করার চেষ্টা করবে
        fragLoadRetry: 5, 
        // প্রতিবার চেষ্টার মধ্যে ১ সেকেন্ড দেরি করবে
        fragLoadRetryDelay: 1000,
        // (*** নতুন এবং সবচেয়ে গুরুত্বপূর্ণ পরিবর্তন ***)
        // XHR অনুরোধ সেটআপ করার জন্য
        xhrSetup: function (xhr, url) {
            // সার্ভার যদি কুকি বা সেশন-ভিত্তিক প্রমাণীকরণ ব্যবহার করে, তবে এটি প্রয়োজন
            xhr.withCredentials = true; 
        }
    };

    hls = new Hls(hlsConfig);
    hls.loadSource(videoUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
            console.error('Fatal HLS error occurred:', data.type, data.details);
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('A network error occurred. Trying to recover...');
                    hls.startLoad(); // লোড আবার শুরু করার চেষ্টা
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('A media error occurred. Trying to recover...');
                    hls.recoverMediaError(); // মিডিয়া এরর থেকে রিকভার করার চেষ্টা
                    break;
                default:
                    console.log('Unrecoverable HLS error. Destroying HLS instance.');
                    hls.destroy();
                    break;
            }
        }
    });
}
// ==========================================================

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
// === Event Listeners ===
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
speedMenuBtn.addEventListener('click', () => {
    showMenuPage(speedSettingsPage);
});
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

function setQuality(level, url = null) {
    const qualityMenuBtn = document.getElementById('quality-menu-btn');
    const qualityCurrentValue = qualityMenuBtn ? qualityMenuBtn.querySelector('.current-value') : null;

    const allQualityOptions = qualityOptionsList.querySelectorAll('li');
    allQualityOptions.forEach(opt => opt.classList.remove('active'));

    if (url) {
        setupHls(url); 
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play();
        });
        
        if (qualityCurrentValue) qualityCurrentValue.textContent = '1080p';
        const option1080p = qualityOptionsList.querySelector(`li[data-level='${level}']`);
        if (option1080p) option1080p.classList.add('active');
    } else {
        hls.currentLevel = parseInt(level);
        
        if (level === -1) {
            if (qualityCurrentValue) qualityCurrentValue.textContent = 'Auto';
        }
        
        const option = qualityOptionsList.querySelector(`li[data-level='${level}']`);
        if (option) option.classList.add('active');
    }
    showMenuPage(mainSettingsPage);
}

hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (data.levels.length > 0) {
        if (!document.getElementById('quality-menu-btn')) {
            const qualityMenuBtn = document.createElement('li');
            qualityMenuBtn.id = 'quality-menu-btn';
            qualityMenuBtn.innerHTML = `
                <div class="menu-item-label">
                    <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 256 256" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M216,104H102.09L210,75.51a8,8,0,0,0,5.68-9.84l-8.16-30a15.93,15.93,0,0,0-19.42-11.13L35.81,64.74a15.75,15.75,0,0,0-9.7,7.4,15.51,15.51,0,0,0-1.55,12L32,111.56c0,.14,0,.29,0,.44v88a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V112A8,8,0,0,0,216,104ZM192.16,40l6,22.07L164.57,71,136.44,54.72ZM77.55,70.27l28.12,16.24-59.6,15.73-6-22.08Z"></path></svg>
                    <span>Quality</span>
                </div>
                <div class="menu-item-value">
                    <span class="current-value">Auto</span>
                    <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg>
                </div>`;
            qualityMenuBtn.addEventListener('click', () => showMenuPage(qualitySettingsPage));
            playerSettingsGroup.prepend(qualityMenuBtn);
        }
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
    }
    try {
        const currentUrl = new URL(videoUrl);
        const pathSegments = currentUrl.pathname.split('/');
        if (!pathSegments.includes('1080')) {
            const lastSegmentIndex = pathSegments.findLastIndex(seg => seg.includes('.m3u8'));
            if (lastSegmentIndex > -1) {
                let segments1080 = [...pathSegments];
                segments1080.splice(lastSegmentIndex, 0, '1080');
                const potential1080pUrl = currentUrl.origin + segments1080.join('/') + currentUrl.search;
                fetch(potential1080pUrl, { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            const option1080p = document.createElement('li');
                            option1080p.textContent = '1080p';
                            option1080p.dataset.level = '1080';
                            option1080p.addEventListener('click', () => setQuality('1080', potential1080pUrl));
                            qualityOptionsList.appendChild(option1080p);
                        }
                    })
                    .catch(err => console.warn("1080p check failed:", err));
            }
        }
    } catch(e) { console.error("Error creating URL for 1080p check:", e); }
    if (settingsMenu.classList.contains('active')) {
        setTimeout(() => menuContentWrapper.style.height = `${mainSettingsPage.scrollHeight}px`, 0);
    }
});

hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
    const qualityMenuBtn = document.getElementById('quality-menu-btn');
    if (!qualityMenuBtn) return;
    const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
    
    if (hls.autoLevelEnabled) {
        const activeLevel = hls.levels[data.level];
        if (activeLevel) {
            qualityCurrentValue.textContent = `${activeLevel.height}p (Auto)`;
            const allQualityOptions = qualityOptionsList.querySelectorAll('li');
            allQualityOptions.forEach(opt => opt.classList.remove('active'));
            const autoOption = qualityOptionsList.querySelector('li[data-level="-1"]');
            if(autoOption) autoOption.classList.add('active');
            const currentQualityOption = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`);
            if(currentQualityOption) currentQualityOption.classList.add('active');
        }
    } 
});

// === পেজ লোড হলে যা যা ঘটবে ===
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) {
        loadVideo(videoUrl);
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
    updatePlayState();
    updateVolumeIcon();
    updateFullscreenState();
});
