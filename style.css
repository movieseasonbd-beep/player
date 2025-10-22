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
let originalVideoUrl = null; // নতুন: মূল ভিডিওর URL সংরক্ষণ করার জন্য

// Wake Lock এর জন্য ভ্যারিয়েবল
let wakeLock = null;

// HLS Configuration
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

// স্ক্রিন চালু রাখার জন্য ফাংশন
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

// === পরিবর্তিত loadVideo ফাংশন ===
function loadVideo(videoUrl) {
    // ঠিক ৩ সেকেন্ড পরে লোডিং স্ক্রিনটি লুকিয়ে ফেলার জন্য টাইমার সেট করা হলো
    setTimeout(() => {
        if (!loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
    }, 3000); // সময়: ৩ সেকেন্ড (3000 মিলিসেকেন্ড)

    // একই সাথে, ভিডিও লোড করার প্রক্রিয়া ব্যাকগ্রাউন্ডে চলতে থাকবে
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        initializeHls();
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        video.src = videoUrl;
    }
}

// ==========================================================
// === নতুন এবং উন্নত setQuality ফাংশন ===
// ==========================================================
function setQuality(level, url = null) {
    const currentTime = video.currentTime;
    const isPlaying = !video.paused;

    // যদি একটি নতুন URL (যেমন 1080p) লোড করার জন্য আসে
    if (url) {
        initializeHls();
        
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.once(Hls.Events.LEVEL_LOADED, () => {
            video.currentTime = currentTime;
            if (isPlaying) {
                video.play();
            }
        });

        // UI ম্যানুয়ালি আপডেট করা হচ্ছে, কারণ আমরা লিস্টটি নতুন করে তৈরি করছি না
        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (qualityMenuBtn) {
            const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
            qualityCurrentValue.textContent = 'HD 1080p';
        }
        qualityOptionsList.querySelectorAll('li').forEach(opt => opt.classList.remove('active', 'playing'));
        const new1080pOption = qualityOptionsList.querySelector('li[data-level="1080"]');
        if (new1080pOption) {
            new1080pOption.classList.add('active');
        }

    } else { // যদি আগের লিস্টের কোনো কোয়ালিটি (যেমন Auto, 720p) সিলেক্ট করা হয়
        
        // যদি প্লেয়ারটি বর্তমানে বাহ্যিক 1080p সোর্স চালাচ্ছে, তবে মূল সোর্সে ফিরে যেতে হবে
        if (hls.url !== originalVideoUrl) {
            initializeHls();
            hls.loadSource(originalVideoUrl);
            hls.attachMedia(video);

            // মূল সোর্সটি লোড হওয়ার পর নির্দিষ্ট কোয়ালিটি সেট করা হবে
            hls.once(Hls.Events.MANIFEST_PARSED, () => {
                hls.currentLevel = parseInt(level, 10);
                video.currentTime = currentTime;
                if (isPlaying) {
                    video.play();
                }
            });
        } else {
            // যদি প্লেয়ারটি 이미 মূল সোর্সেই থাকে, তবে শুধু লেভেল পরিবর্তন করলেই হবে
            hls.currentLevel = parseInt(level, 10);
        }
    }
    showMenuPage(mainSettingsPage);
}


// Player UI Functions
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
                if (level.height === 1080) {
                    option.textContent = `HD 1080p`;
                } else {
                    option.textContent = `${level.height}p`;
                }
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
                } catch (e) {
                    console.error("Error while trying to guess 1080p URL:", e);
                }
            }
        }
        qualityMenuInitialized = true;
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        // যদি প্লেয়ারটি একটি বাহ্যিক URL (যেমন 1080p) চালায়, তাহলে এই লজিকটি এড়িয়ে যান
        if (hls.url !== originalVideoUrl) return;

        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (!qualityMenuBtn) return;
        const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
        const allQualityOptions = qualityOptionsList.querySelectorAll('li');
        allQualityOptions.forEach(opt => {
            opt.classList.remove('active');
            opt.classList.remove('playing');
        });

        // 1080p অপশনটিকে নিষ্ক্রিয় করুন যদি এটি বাহ্যিক হয়
        const external1080p = qualityOptionsList.querySelector('li[data-level="1080"]');
        if (external1080p) external1080p.classList.remove('active');

        const activeLevel = hls.levels[data.level];
        if (!activeLevel) return;
        if (hls.autoLevelEnabled) {
            if (activeLevel.height === 1080) {
                qualityCurrentValue.textContent = `HD 1080p (Auto)`;
            } else {
                qualityCurrentValue.textContent = `${activeLevel.height}p (Auto)`;
            }
            const autoOpt = qualityOptionsList.querySelector('li[data-level="-1"]');
            if (autoOpt) autoOpt.classList.add('active');
            const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`);
            if (currentPlayingOpt) {
                currentPlayingOpt.classList.add('playing');
            }
        } else {
            if (activeLevel.height === 1080) {
                 qualityCurrentValue.textContent = `HD 1080p`;
            } else {
                 qualityCurrentValue.textContent = `${activeLevel.height}p`;
            }
            const currentPlayingOpt = qualityOptionsList.querySelector(`li[data-level="${data.level}"]`);
            if (currentPlayingOpt) {
                currentPlayingOpt.classList.add('active');
            }
        }
    });
    
    hls.on(Hls.Events.ERROR, function(event, data) {
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
// === General Event Listeners ===
// ==========================================================
video.addEventListener('click', handleScreenTap);
centralPlayBtn.addEventListener('click', directTogglePlay);
playPauseBtn.addEventListener('click', directTogglePlay);

// Wake Lock এর জন্য ইভেন্ট
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

// ব্যবহারকারী ট্যাব পরিবর্তন করলে Wake Lock নিয়ন্ত্রণ
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && wakeLock !== null) {
        releaseWakeLock();
    } else if (document.visibilityState === 'visible' && !video.paused) {
        acquireWakeLock();
    }
});

// ==========================================================
// === Page Load ===
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    originalVideoUrl = videoUrl; // মূল URL সংরক্ষণ করা হচ্ছে

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
