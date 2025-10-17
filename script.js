const playerContainer = document.querySelector('.player-container');
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
let currentVideoUrl = '';

function loadVideo(videoUrl) {
    currentVideoUrl = videoUrl;
    hls.destroy(); hls = new Hls();
    if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
    } else {
        video.src = videoUrl;
    }
}

function saveProgress() {
    // ভিডিওর সময় ১ সেকেন্ডের বেশি হলেই কেবল সেভ হবে
    if (video.currentTime > 1 && currentVideoUrl) {
        localStorage.setItem(`video-progress-${currentVideoUrl}`, video.currentTime);
    }
}

function loadProgress() {
    if (currentVideoUrl) {
        const savedTime = localStorage.getItem(`video-progress-${currentVideoUrl}`);
        // ভিডিওর মোট সময়ের চেয়ে সেভ করা সময় কম হলেই কেবল লোড হবে
        if (savedTime && video.duration && parseFloat(savedTime) < video.duration - 1) {
            video.currentTime = parseFloat(savedTime);
        }
    }
}

function clearProgress() {
    if (currentVideoUrl) {
        localStorage.removeItem(`video-progress-${currentVideoUrl}`);
    }
}

function togglePlay() { if (video.src) video.paused ? video.play() : video.pause(); }

function updatePlayState() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = video.paused ? 'fas fa-play' : 'fas fa-pause';
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
    const icon = volumeBtn.querySelector('i');
    icon.className = video.muted || video.volume === 0 ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
    volumeBtn.classList.toggle('active', video.muted);
}
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else { document.exitFullscreen(); }
}
function updateFullscreenState() {
    const isFullscreen = !!document.fullscreenElement;
    fullscreenBtn.classList.toggle('active', isFullscreen);
    fullscreenTooltip.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
}
function toggleSettingsMenu() {
    settingsMenu.classList.toggle('active');
    settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
}

// === Event Listeners (পরিবর্তন এখানে করা হয়েছে) ===
video.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayState);
video.addEventListener('pause', () => {
    updatePlayState();
    saveProgress(); // শুধুমাত্র পজ করলেই সময় সেভ হবে
});
video.addEventListener('ended', clearProgress); // ভিডিও শেষ হলে সেভ করা সময় মুছে যাবে
video.addEventListener('timeupdate', updateProgressUI); // শুধু UI আপডেটের জন্য ব্যবহার হবে
video.addEventListener('progress', updateBufferBar);
video.addEventListener('canplay', () => {
    updateProgressUI();
    updateBufferBar();
    updatePlayState();
    loadProgress(); // ভিডিও প্রস্তুত হলে সেভ করা সময় লোড হবে
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

document.addEventListener('DOMContentLoaded', () => {
    updatePlayState();
    updateProgressUI();
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) {
        loadVideo(videoUrl);
    }
});

// পেজ বন্ধ করার আগে সময় সেভ করা হবে
window.addEventListener('beforeunload', saveProgress);
