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

// ফাংশন: প্রোগ্রেস বারের রঙ তাৎক্ষণিকভাবে আপডেট করার জন্য
function updateProgressBarVisual() {
    const progressPercent = (video.currentTime / video.duration) * 100;
    progressBar.style.background = `linear-gradient(to right, var(--theme-color) ${progressPercent}%, rgba(255, 255, 255, 0.3) ${progressPercent}%)`;
    progressBar.value = progressPercent;
}

function togglePlay() {
    if (video.src) video.paused ? video.play() : video.pause();
}

function updatePlayState() {
    const icon = playPauseBtn.querySelector('i');
    icon.className = video.paused ? 'fas fa-play' : 'fas fa-pause';
    playerContainer.classList.toggle('playing', !video.paused);
    playerContainer.classList.toggle('paused', video.paused);
}

function updateTimeDisplay() {
    const totalDuration = isNaN(video.duration) ? 0 : video.duration;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(totalDuration)}`;
}

function setProgress(e) {
    const newTime = (e.target.value / 100) * video.duration;
    video.currentTime = newTime;
    // টেনে দেখার সময়ও যেন রঙ এবং সময় তাৎক্ষণিক পরিবর্তন হয়
    updateProgressBarVisual();
    updateTimeDisplay();
}

function formatTime(seconds) {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return hh ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

// নতুন ভলিউম ফাংশন (শুধু মিউট/আনমিউট)
function toggleMute() {
    video.muted = !video.muted;
}
function updateVolumeIcon() {
    const icon = volumeBtn.querySelector('i');
    icon.className = video.muted || video.volume === 0 ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        playerContainer.requestFullscreen().catch(err => alert(`Fullscreen error: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
}
document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.classList.toggle('active', !!document.fullscreenElement);
});

// পেইজ লোড হলে URL থেকে ভিডিও লিঙ্ক নেয়
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoUrl = urlParams.get('id');
    if (videoUrl) { video.src = videoUrl; }
});

// ইভেন্ট লিসেনার
video.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayState);
video.addEventListener('pause', updatePlayState);
video.addEventListener('timeupdate', () => {
    updateProgressBarVisual();
    updateTimeDisplay();
});
video.addEventListener('canplay', () => {
    updateProgressBarVisual();
    updateTimeDisplay();
});
video.addEventListener('volumechange', updateVolumeIcon);
centralPlayBtn.addEventListener('click', togglePlay);
playPauseBtn.addEventListener('click', togglePlay);
rewindBtn.addEventListener('click', () => { video.currentTime -= 10; });
forwardBtn.addEventListener('click', () => { video.currentTime += 10; });
progressBar.addEventListener('input', setProgress); // মূল পরিবর্তন এখানে
volumeBtn.addEventListener('click', toggleMute);
fullscreenBtn.addEventListener('click', toggleFullscreen);
