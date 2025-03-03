// Simplified fullscreen toggle function
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        // Try to enter fullscreen
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else if (document.documentElement.mozRequestFullScreen) { // Firefox
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari
            document.documentElement.webkitRequestFullscreen();
        } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
            document.documentElement.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }
}

function updateFullscreenState() {
    const currentlyFullscreen = !!(document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement);

    if (currentlyFullscreen) {
        slideshowContainer.classList.add('is-fullscreen');
        hideFullscreenButton();
    } else {
        slideshowContainer.classList.remove('is-fullscreen');
        showFullscreenButton();
    }
}

function showFullscreenButton() {
    fullscreenBtn.classList.add('show');
    clearTimeout(mouseTimer);
}

function hideFullscreenButton() {
    fullscreenBtn.classList.remove('show');
}

// Mouse movement handler for fullscreen mode
function handleMouseMove() {
    // Check current fullscreen state every time
    const currentlyFullscreen = !!(document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement);

    if (currentlyFullscreen) {
        showFullscreenButton();

        // Hide the button after 3 seconds of inactivity
        clearTimeout(mouseTimer);
        mouseTimer = setTimeout(hideFullscreenButton, 3000);
    }
}document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const slideImage = document.getElementById('slideImage');
    const slideQuote = document.getElementById('slideQuote');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const preloadedImagesContainer = document.getElementById('preloadedImages');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const slideshowContainer = document.querySelector('.slideshow-container');

    // State management
    let slides = [];
    let preloadedImages = {};
    let currentSlideIndex = 0;
    let slideshowInterval;
    let allImagesLoaded = false;
    const slideInterval = 60000; // 7 seconds per slide (longer to enjoy each image)
    // We'll check fullscreen state directly rather than storing it in a variable
    let mouseTimer;

    // Functions
    async function fetchSlides() {
        try {
            const response = await fetch('/api/slides');
            if (!response.ok) {
                throw new Error('Failed to fetch slides');
            }

            slides = await response.json();
            if (slides.length > 0) {
                // Show the first slide immediately to prevent blank screen
                showSlide(0);

                // Then preload the rest of the images
                await preloadAllImages();

                // Start the slideshow
                startSlideshow();
            } else {
                // No slides found
                slideQuote.textContent = 'No slides available.';
                slideQuote.style.opacity = 1;
            }
        } catch (error) {
            console.error('Error:', error);
            slideQuote.textContent = 'Error loading slides. Please try again later.';
            slideQuote.style.opacity = 1;
        }
    }

    // Preload all images
    async function preloadAllImages() {
        const preloadPromises = slides.map(slide => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    preloadedImages[slide.imageUrl] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${slide.imageUrl}`);
                    reject();
                };
                img.src = slide.imageUrl;
                preloadedImagesContainer.appendChild(img);
            });
        });

        try {
            await Promise.all(preloadPromises);
            allImagesLoaded = true;
            console.log('All images preloaded successfully');
        } catch (error) {
            console.error('Error preloading images:', error);
        }
    }

    function showSlide(index) {
        if (slides.length === 0) return;

        currentSlideIndex = index;
        const slide = slides[currentSlideIndex];

        // Set image source first, then fade in
        if (allImagesLoaded && preloadedImages[slide.imageUrl]) {
            slideImage.src = preloadedImages[slide.imageUrl].src;
        } else {
            slideImage.src = slide.imageUrl;
        }

        slideQuote.textContent = `"${slide.quote}"`;
        quoteAuthor.textContent = slide.author ? `— ${slide.author}` : '';

        // Small delay to ensure the image has started loading
        setTimeout(() => {
            // Make elements visible
            slideImage.style.opacity = 1;
            slideQuote.style.opacity = 1;
            quoteAuthor.style.opacity = 1;
        }, 50);
    }

    function nextSlide() {
        const newIndex = (currentSlideIndex + 1) % slides.length;
        showSlide(newIndex);
    }

    function startSlideshow() {
        stopSlideshow();
        slideshowInterval = setInterval(nextSlide, slideInterval);
    }

    function stopSlideshow() {
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
        }
    }

    // When image loads, ensure we handle any loading issues
    slideImage.addEventListener('load', () => {
        // Image is already transitioning to opacity 1 via CSS
    });

    slideImage.addEventListener('error', () => {
        console.error('Failed to load image');
        // Move to next slide if current one fails
        setTimeout(nextSlide, 1000);
    });

    // Event listeners for fullscreen
    fullscreenBtn.addEventListener('click', toggleFullScreen);

    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('mozfullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState);
    document.addEventListener('MSFullscreenChange', updateFullscreenState);

    // Mouse movement listener
    document.addEventListener('mousemove', handleMouseMove);

    // When the page loads, initialize everything
    fetchSlides().catch(error => {
        console.error('Failed to initialize slideshow:', error);
        // Show error message on the page
        slideQuote.textContent = 'Failed to load the slideshow. Please refresh the page.';
        slideQuote.style.opacity = 1;
    });
});