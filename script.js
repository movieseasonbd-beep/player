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

// ==========================================================
// === শুরু থেকে শেষ পর্যন্ত সকল ফাংশন এখানে গোছানো আছে ===
// ==========================================================

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

// === পরিবর্তন: togglePlay এবং handleVideoClick ফাংশনকে একত্রিত করে একটি নতুন ফাংশন বানানো হয়েছে ===
function masterTogglePlay() {
    // কন্ট্রোল বার দেখা যাচ্ছে কিনা তা পরীক্ষা করা হচ্ছে
    const areControlsVisible = playerContainer.classList.contains('show-controls') || getComputedStyle(document.querySelector('.controls-container')).opacity === '1';

    if (video.paused) {
        // যদি ভিডিও পজ থাকে, তাহলে প্লে করো
        video.play();
    } else {
        // যদি ভিডিও চলতে থাকে...
        if (areControlsVisible) {
            // এবং কন্ট্রোল বার দেখা যায়, তাহলে ভিডিও পজ করো (দ্বিতীয় ট্যাপ)
            video.pause();
        } else {
            // এবং কন্ট্রোল বার দেখা না গেলে, শুধু কন্ট্রোল বার দেখাও (প্রথম ট্যাপ)
            playerContainer.classList.add('show-controls');
            resetControlsTimer(); // টাইমার চালু করো যাতে কন্ট্রোল বার আবার লুকিয়ে যায়
        }
    }
}

function updatePlayState() {
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    
    if (video.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playerContainer.classList.add('paused');
        playerContainer.classList.remove('playing');
    } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playerContainer.classList.remove('paused');
        playerContainer.classList.add('playing');
    }
}

function hideControls() {
    if (!video.paused && !settingsMenu.classList.contains('active')) {
        playerContainer.classList.remove('show-controls');
    }
}

function resetControlsTimer() {
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
}

function updateProgressUI() {
    if (video.duration) {
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = progressPercent;
        const totalDuration = isNaN(video.duration) ? 0 : video.duration;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
    }
}

function updateBufferBar() {
    if (video.duration > 0 && video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = (bufferEnd / video.duration) * 100;
        bufferBar.style.width = `${bufferPercent}%`;
    }
}

function scrub(e) {
    const scrubTime = (e.target.value / 100) * video.duration;
    if (!isNaN(scrubTime)) {
        video.currentTime = scrubTime;
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) seconds = 0;
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleMute() {
    video.muted = !video.muted;
}

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
        await playerContainer.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else {
        await document.exitFullscreen();
    }
}

function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
    fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}

function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
}

// ==========================================================
// === সমস্ত Event Listener এখানে একসাথে রাখা হয়েছে ===
// ==========================================================

// প্লে/পজ সংক্রান্ত ক্লিক ইভেন্ট
video.addEventListener('click', masterTogglePlay);
centralPlayBtn.addEventListener('click', masterTogglePlay);
playPauseBtn.addEventListener('click', masterTogglePlay);

// ভিডিওর নিজস্ব ইভেন্ট
video.addEventListener('play', () => {
    updatePlayState();
    resetControlsTimer();
});
video.addEventListener('pause', () => {
    updatePlayState();
    clearTimeout(controlsTimeout);
    playerContainer.classList.add('show-controls');
});
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);
video.addEventListener('volumechange', updateVolumeIcon);
video.addEventListener('canplay', () => {
    updateProgressUI();
    updateBufferBar();
});

// অন্যান্য কন্ট্রোল বাটনের ইভেন্ট
rewindBtn.addEventListener('click', () => { if(video.duration) video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { if(video.duration) video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);
progressBar.addEventListener('input', scrub);

// সেটিংস মেনু
settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

// কন্ট্রোল বার দেখানো এবং লুকানোর জন্য
playerContainer.addEventListener('mousemove', () => {
    playerContainer.classList.add('show-controls');
    resetControlsTimer();
});

// পেজ লোড হলে যা ঘটবে
document.addEventListener('DOMContentLoaded', () => {
    updatePlayState();
    updateProgressUI();
    updateVolumeIcon();
    updateFullscreenState();

    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        loadVideo(videoUrl);
        setTimeout(() => loadingOverlay.classList.add('hidden'), 3000);
    } else {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
});
