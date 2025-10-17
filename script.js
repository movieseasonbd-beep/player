const playerContainer = document.querySelector('.player-container');
const video = document.querySelector('.video');
const centralPlayBtn = document.querySelector('.central-play-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.querySelector('.volume-slider');
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
    progressBar.style.background = `linear-gradient(to right, var(--theme-color) ${progressPercent}%, rgba(255, 255, 255, 0.4) ${progressPercent}%)`;
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

function changeVolume(e) {
    video.volume = e.target.value;
    updateVolumeIcon();
}

function updateVolumeIcon() {
    const icon = volumeBtn.querySelector('i');
    if (video.volume === 0 || video.muted) { icon.className = 'fas fa-volume-xmark'; } 
    else if (video.volume < 0.5) { icon.className = 'fas fa-volume-low'; } 
    else { icon.className = 'fas fa-volume-high'; }
}

function toggleMute() {
    video.muted = !video.muted;
    volumeSlider.value = video.muted ? 0 : video.volume;
    updateVolumeIcon();
}

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

// পেইজ লোড হলে URL থেকে ভিডিও লিঙ্ক নেয়
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) {
        video.src = videoUrl;
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
volumeSlider.addEventListener('input', changeVolume);
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
