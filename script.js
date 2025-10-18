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

// === পরিবর্তন এখানে (ভ্যারিয়েবল সরানো হয়েছে) ===
// let isVideoReady = false;
// let isMinTimeElapsed = false;

// Functions
function hideLoadingScreen() {
    // এখন আর কোনো শর্ত চেক করার প্রয়োজন নেই
    loadingOverlay.classList.add('hidden');
}

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

function togglePlay() { 
    if (video.src) video.paused ? video.play() : video.pause(); 
}

function updatePlayState() {
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    
    if (video.paused) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    } else {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    }
    
    playerContainer.classList.toggle('playing', !video.paused);
    playerContainer.classList.toggle('paused', video.paused);
}

function updateProgressUI() {
    let progressPercent = 0;
    if (video.duration) {
        progressPercent = (video.currentTime / video.duration) * 100;
    }
    progressFilled.style.width = `${progressPercent}%`;
    progressBar.value = progressPercent;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
}

function updateBufferBar() {
    if (video.duration > 0 && video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const bufferPercent = (bufferEnd / video.duration) * 100;
        bufferBar.style.width = `${bufferPercent}%`;
    }
}

function scrub(e) {
    const value = e.target.value;
    const scrubTime = (value / 100) * video.duration;
    if (!isNaN(scrubTime)) { video.currentTime = scrubTime; }
    progressFilled.style.width = `${value}%`;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(scrubTime)} / ${formatTime(totalDuration)}`;
}

function formatTime(seconds) {
    if (isNaN(seconds)) seconds = 0;
    const date = new Date(seconds * 1000);
    const [hh, mm, ss] = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()].map(v => v.toString().padStart(2, '0'));
    return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function toggleMute() { video.muted = !video.muted; }

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
        await playerContainer.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
        } catch (err) {
            console.warn("Screen orientation lock failed:", err);
        }
    } else {
        await document.exitFullscreen();
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (err) {
            console.warn("Screen orientation unlock failed:", err);
        }
    }
}

function updateFullscreenState() {
    const fullscreenOnIcon = fullscreenBtn.querySelector('.fullscreen-on-icon');
    const fullscreenOffIcon = fullscreenBtn.querySelector('.fullscreen-off-icon');
    const isFullscreen = !!document.fullscreenElement;
    
    if (isFullscreen) {
        fullscreenOnIcon.style.display = 'none';
        fullscreenOffIcon.style.display = 'block';
    } else {
        fullscreenOnIcon.style.display = 'block';
        fullscreenOffIcon.style.display = 'none';
    }
    
    fullscreenBtn.classList.toggle('active', isFullscreen);
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}

function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
}

// Event Listeners
video.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayState);
video.addEventListener('pause', updatePlayState);
video.addEventListener('timeupdate', updateProgressUI);
video.addEventListener('progress', updateBufferBar);

// === canplay ইভেন্টটি এখন আর লোডিং স্ক্রিন নিয়ন্ত্রণ করে না ===
video.addEventListener('canplay', () => {
    updateProgressUI();
    updateBufferBar();
    updatePlayState();
    // hideLoadingScreen() ফাংশনটি এখান থেকে সরিয়ে দেওয়া হয়েছে
});

video.addEventListener('volumechange', updateVolumeIcon);

centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { if(video.duration) video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { if(video.duration) video.currentTime += 10; });
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenState);
progressBar.addEventListener('input', scrub);
settingsBtn.addEventListener('click', toggleSettingsMenu);
closeSettingsBtn.addEventListener('click', toggleSettingsMenu);
speedOptions.forEach(option => {
    option.addEventListener('click', () => {
        video.playbackRate = option.dataset.speed;
        speedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
    });
});

// === পরিবর্তন এখানে (DOMContentLoaded ইভেন্ট) ===
document.addEventListener('DOMContentLoaded', () => {
    updatePlayState();
    updateProgressUI();
    updateVolumeIcon();
    updateFullscreenState();

    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    
    if (videoUrl) {
        // পেছনে ভিডিও লোড শুরু
        loadVideo(videoUrl);
        
        // ঠিক ৩ সেকেন্ড পর লোডিং স্ক্রিন লুকিয়ে ফেলা হবে
        setTimeout(hideLoadingScreen, 3000); // 3000 মিলিসেকেন্ড = 3 সেকেন্ড

    } else {
        // কোনো ভিডিও লিঙ্ক না থাকলে লোডিং স্ক্রিন সাথে সাথেই লুকিয়ে ফেলা হবে
        hideLoadingScreen();
        loadingOverlay.querySelector('.loading-text').textContent = "No video source found.";
    }
});
