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
let singleTapTimeout;

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

// === পরিবর্তন #১: ট্যাপ করার আচরণ চূড়ান্তভাবে ঠিক করা হয়েছে ===
function handleScreenTap(e) {
    // ডাবল ট্যাপের ডিলে চলাকালীন অন্য ট্যাপ ইভেন্ট উপেক্ষা করুন
    if (e.detail > 1) {
        e.preventDefault();
        return;
    }
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    clearTimeout(singleTapTimeout);

    if (tapLength < 300 && tapLength > 0) { // ডাবল ট্যাপ
        const rect = video.getBoundingClientRect();
        const tapPosition = (e.clientX - rect.left) / rect.width;
        if (tapPosition < 0.4) video.currentTime -= 10;
        else if (tapPosition > 0.6) video.currentTime += 10;
        lastTap = 0; // ডাবল ট্যাপের পর রিসেট করুন
    } else { // সিঙ্গেল ট্যাপ
        singleTapTimeout = setTimeout(() => {
            const isControlsVisible = playerContainer.classList.contains('show-controls');
            if (!video.paused) { // ভিডিও চলন্ত অবস্থায়...
                if (isControlsVisible) {
                    video.pause(); // কন্ট্রোল দেখা গেলে -> পজ কর
                } else {
                    playerContainer.classList.add('show-controls'); // কন্ট্রোল হাইড থাকলে -> দেখাও
                    resetControlsTimer();
                }
            } else { // ভিডিও পজড অবস্থায়...
                video.play(); // -> প্লে কর
            }
        }, 200);
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


// === পরিবর্তন #২: ফুলস্ক্রিন এবং স্ক্রিন ঘোরানোর চূড়ান্ত নির্ভরযোগ্য কোড ===
function isFullScreen() {
    return !!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement);
}

async function toggleFullscreen() {
    // প্রথমে পরীক্ষা করুন ফুলস্ক্রিন বর্তমানে সক্রিয় কি না
    const isCurrentlyFullScreen = isFullScreen();

    if (!isCurrentlyFullScreen) {
        // ফুলস্ক্রিন মোডে প্রবেশ
        if (playerContainer.requestFullscreen) await playerContainer.requestFullscreen();
        else if (playerContainer.webkitRequestFullscreen) await playerContainer.webkitRequestFullscreen();
        else if (video.webkitEnterFullscreen) { // iOS Safari এর জন্য বিশেষ পদ্ধতি
            video.webkitEnterFullscreen();
            return;
        }

        // ফুলস্ক্রিনে প্রবেশের পর স্ক্রিন ঘোরানোর চেষ্টা (শুধুমাত্র সমর্থিত ডিভাইসে কাজ করবে)
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
        } catch (err) {
            console.warn("Could not lock screen orientation:", err);
        }

    } else {
        // ফুলস্ক্রিন মোড থেকে প্রস্থান
        // প্রস্থান করার আগে স্ক্রিন আনলক করার চেষ্টা
         try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {
             console.warn("Could not unlock screen orientation:", err);
        }

        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
}


function updateFullscreenState() {
    const isFullscreen = isFullScreen();
    fullscreenBtn.classList.toggle('active', isFullscreen);
    fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
    fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
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

// সব ধরনের ব্রাউজারের জন্য ফুলস্ক্রিন ইভেন্ট লিসেনার
['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
    event => document.addEventListener(event, updateFullscreenState, false)
);


progressBar.addEventListener('input', e => {
    const scrubTime = (e.target.value / 100) * video.duration;
    if (video.duration) {
       progressFilled.style.width = `${e.target.value}%`;
       timeDisplay.textContent = `${formatTime(scrubTime)} / ${formatTime(video.duration)}`;
    }
    scrub(e);
});

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
        toggleSettingsMenu();
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
        setTimeout(() => loadingOverlay.classList.add('hidden'), 3000); 
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.querySelector('.loading-content').innerHTML = "No video source found.";
    }

    updatePlayState();
    updateVolume();
    updateFullscreenState();
});
