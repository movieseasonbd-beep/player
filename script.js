const playerContainer = document.querySelector('.player-container');
const video = document.querySelector('.video');
const centralPlayBtn = document.querySelector('.central-play-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeBtn = document.getElementById('volume-btn');
const progressBar = document.querySelector('.progress-bar');
const timeDisplay = document.querySelector('.time-display');
const fullscreenBtn = document.getElementById('fullscreen-btn');

function togglePlay() {
    if (video.src) {
        video.paused ? video.play() : video.pause();
    }
}

function updatePlayState() {
    const icon = playPauseBtn.querySelector('i');
    if (video.paused) {
        icon.className = 'fas fa-play';
        playerContainer.classList.remove('playing');
        playerContainer.classList.add('paused');
    } else {
        icon.className = 'fas fa-pause';
        playerContainer.classList.add('playing');
        playerContainer.classList.remove('paused');
    }
}

function updateProgress() {
    const progressPercent = (video.currentTime / video.duration) * 100;
    progressBar.value = progressPercent;
    progressBar.style.background = `linear-gradient(to right, var(--theme-color) ${progressPercent}%, rgba(255, 255, 255, 0.3) ${progressPercent}%)`;
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
}

function setProgress(e) {
    const newTime = (e.target.value / 100) * video.duration;
    video.currentTime = newTime;
}

function formatTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function updateVolumeIcon(volumeLevel) {
    const icon = volumeBtn.querySelector('i');
    if (volumeLevel === 0) { icon.className = 'fas fa-volume-xmark'; } 
    else if (volumeLevel < 0.5) { icon.className = 'fas fa-volume-low'; } 
    else { icon.className = 'fas fa-volume-high'; }
}

video.addEventListener('volumechange', () => {
    updateVolumeIcon(video.volume);
});

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}
document.addEventListener('fullscreenchange', () => {
    document.fullscreenElement ? fullscreenBtn.classList.add('active') : fullscreenBtn.classList.remove('active');
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) {
        video.src = videoUrl;
    } else {
        // কোনো ভিডিও লিঙ্ক না থাকলে একটি মেসেজ দেখাবে (ঐচ্ছিক)
        const controls = document.querySelector('.controls-container');
        controls.innerHTML = '<p style="width: 100%; text-align: center;">No video source found. Please provide a video link using ?id=</p>';
    }
});

video.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayState);
video.addEventListener('pause', updatePlayState);
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('canplay', updateProgress);
centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
progressBar.addEventListener('input', setProgress);
fullscreenBtn.addEventListener('click', toggleFullscreen);
