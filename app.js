document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const imageInput = document.getElementById('imageInput');
    const dropZone = document.getElementById('dropZone');
    const uploadOverlay = document.getElementById('uploadOverlay');
    const changeImageBtn = document.getElementById('changeImage');
    const deleteImageBtn = document.getElementById('deleteImage');
    const watermarkText = document.getElementById('watermarkText');
    const opacityInput = document.getElementById('opacity');
    const fontSizeInput = document.getElementById('fontSize');
    const rotationInput = document.getElementById('rotation');
    const spacingInput = document.getElementById('spacing');
    const colorInput = document.getElementById('color');
    const fontFamilySelect = document.getElementById('fontFamily');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const savePresetBtn = document.getElementById('savePresetBtn');
    const invertColorBtn = document.getElementById('invertColor');
    const randomColorBtn = document.getElementById('randomColor');
    const patternButtons = document.querySelectorAll('.pattern-btn');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const resetZoomBtn = document.getElementById('resetZoom');
    const fullscreenBtn = document.getElementById('fullscreen');
    const enableShadow = document.getElementById('enableShadow');
    const enableBlur = document.getElementById('enableBlur');
    const enableGradient = document.getElementById('enableGradient');
    const signature = document.getElementById('signature');

    // Value display elements
    const opacityValue = document.getElementById('opacityValue');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const rotationValue = document.getElementById('rotationValue');
    const spacingValue = document.getElementById('spacingValue');
    const imageDimensions = document.getElementById('imageDimensions');
    const imageSize = document.getElementById('imageSize');

    // State variables
    let originalImage = null;
    let currentPattern = 'diagonal';
    let currentZoom = 1;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;
    let presets = JSON.parse(localStorage.getItem('watermarkPresets') || '[]');
    let isDrawing = false;
    let drawTimeout;

    // Signature protection
    const signatureHex = '54656A61737669';
    const signatureText = atob('VGVqYXN2aQ==');
    const heartHex = '2764';
    const builtWithHex = '4275696C74207769746820';
    signature.setAttribute('data-signature', signatureText);
    signature.textContent = `${String.fromCharCode(...builtWithHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))}${String.fromCharCode(parseInt(heartHex, 16))} ${String.fromCharCode(...signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))}`;

    // Optimize slider performance with requestAnimationFrame
    let sliderTimeout;
    function debounceSlider(callback) {
        if (sliderTimeout) {
            cancelAnimationFrame(sliderTimeout);
        }
        sliderTimeout = requestAnimationFrame(callback);
    }

    // Default settings
    const defaultSettings = {
        text: 'WATERMARK',
        opacity: 40,
        fontSize: 24,
        rotation: 45,
        spacing: 5,
        color: '#ffffff',
        fontFamily: 'Roboto',
        pattern: 'diagonal',
        shadow: false,
        blur: false,
        gradient: false
    };

    // Initialize settings
    function initializeSettings() {
        watermarkText.value = defaultSettings.text;
        opacityInput.value = defaultSettings.opacity;
        fontSizeInput.value = defaultSettings.fontSize;
        rotationInput.value = defaultSettings.rotation;
        spacingInput.value = defaultSettings.spacing;
        spacingInput.min = 5;
        spacingInput.max = 10;
        colorInput.value = defaultSettings.color;
        fontFamilySelect.value = defaultSettings.fontFamily;
        enableShadow.checked = defaultSettings.shadow;
        enableBlur.checked = defaultSettings.blur;
        enableGradient.checked = defaultSettings.gradient;
        updateValueDisplays();
    }

    // Update value displays with debouncing
    function updateValueDisplays() {
        opacityValue.textContent = `${opacityInput.value}%`;
        fontSizeValue.textContent = `${fontSizeInput.value}px`;
        rotationValue.textContent = `${rotationInput.value}°`;
        spacingValue.textContent = `${spacingInput.value}x`;
    }

    // Optimize watermark drawing
    function drawWatermark() {
        if (!originalImage) return;

        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Enable high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw original image at full quality
            if (enableBlur.checked) {
                ctx.filter = 'blur(5px)';
            }
            ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';

            // Set watermark properties
            const fontSize = parseInt(fontSizeInput.value);
            const opacity = parseInt(opacityInput.value) / 100;
            const rotation = parseInt(rotationInput.value);
            const spacing = parseFloat(spacingInput.value);
            const text = watermarkText.value;
            const color = colorInput.value;

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.font = `${fontSize}px ${fontFamilySelect.value}`;
            
            if (enableGradient.checked) {
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, invertColor(color));
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = color;
            }

            if (enableShadow.checked) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
            }

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const spacingPx = fontSize * spacing;
            const diagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
            const numWatermarks = Math.ceil(diagonal / spacingPx) * 2;

            // Draw watermark pattern
            switch (currentPattern) {
                case 'diagonal':
                    drawDiagonalPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas);
                    break;
                case 'grid':
                    drawGridPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas);
                    break;
                case 'random':
                    drawRandomPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas);
                    break;
                case 'wave':
                    drawWavePattern(numWatermarks, spacingPx, rotation, text, ctx, canvas);
                    break;
                case 'spiral':
                    drawSpiralPattern(numWatermarks, spacingPx, rotation, text, ctx, canvas);
                    break;
            }

            ctx.restore();
            downloadBtn.disabled = false;
        });
    }

    // Pattern drawing functions
    function drawDiagonalPattern(numWatermarks, spacing, rotation, text, ctx, canvas) {
        for (let i = -numWatermarks; i < numWatermarks; i++) {
            for (let j = -numWatermarks; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkText(x, y, rotation, text, ctx);
            }
        }
    }

    function drawGridPattern(numWatermarks, spacing, rotation, text, ctx, canvas) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing;
                drawWatermarkText(x, y, rotation, text, ctx);
            }
        }
    }

    function drawRandomPattern(numWatermarks, spacing, rotation, text, ctx, canvas) {
        for (let i = 0; i < numWatermarks * 2; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            drawWatermarkText(x, y, rotation, text, ctx);
        }
    }

    function drawWavePattern(numWatermarks, spacing, rotation, text, ctx, canvas) {
        for (let i = 0; i < numWatermarks; i++) {
            for (let j = 0; j < numWatermarks; j++) {
                const x = i * spacing;
                const y = j * spacing + Math.sin(i * 0.5) * spacing;
                drawWatermarkText(x, y, rotation, text, ctx);
            }
        }
    }

    function drawSpiralPattern(numWatermarks, spacing, rotation, text, ctx, canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for (let i = 0; i < numWatermarks * 2; i++) {
            const angle = i * 0.5;
            const radius = i * spacing * 0.5;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            drawWatermarkText(x, y, rotation, text, ctx);
        }
    }

    function drawWatermarkText(x, y, rotation, text, ctx) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    // Color utilities
    function invertColor(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `#${(255 - r).toString(16).padStart(2, '0')}${(255 - g).toString(16).padStart(2, '0')}${(255 - b).toString(16).padStart(2, '0')}`;
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Handle image upload
    function handleImageUpload(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                originalImage = new Image();
                originalImage.onload = () => {
                    // Set canvas size to match container while maintaining aspect ratio
                    const container = document.querySelector('.preview-container');
                    const containerWidth = container.clientWidth;
                    const containerHeight = container.clientHeight;
                    
                    // Calculate dimensions to maintain aspect ratio
                    const imageAspectRatio = originalImage.width / originalImage.height;
                    
                    let canvasWidth, canvasHeight;
                    
                    if (isMobile()) {
                        // Mobile: use original image dimensions for canvas
                        canvasWidth = originalImage.width;
                        canvasHeight = originalImage.height;
                        
                        // Scale down for display while maintaining aspect ratio
                        if (imageAspectRatio > 1) {
                            // Landscape image
                            const displayWidth = containerWidth;
                            const displayHeight = containerWidth / imageAspectRatio;
                            canvas.style.width = `${displayWidth}px`;
                            canvas.style.height = `${displayHeight}px`;
                        } else {
                            // Portrait image
                            const displayHeight = containerHeight;
                            const displayWidth = containerHeight * imageAspectRatio;
                            canvas.style.width = `${displayWidth}px`;
                            canvas.style.height = `${displayHeight}px`;
                        }
                    } else {
                        // Desktop: use original image dimensions with max constraints
                        const maxWidth = Math.min(originalImage.width, containerWidth * 2);
                        const maxHeight = Math.min(originalImage.height, containerHeight * 2);
                        
                        if (maxWidth / maxHeight > imageAspectRatio) {
                            canvasHeight = maxHeight;
                            canvasWidth = maxHeight * imageAspectRatio;
                        } else {
                            canvasWidth = maxWidth;
                            canvasHeight = maxWidth / imageAspectRatio;
                        }
                    }
                    
                    // Set canvas dimensions to match original image quality
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    
                    // Enable high-quality image rendering
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Update image info
                    imageDimensions.textContent = `${originalImage.width} × ${originalImage.height}`;
                    imageSize.textContent = `${(file.size / 1024).toFixed(1)} KB`;
                    
                    // Show controls
                    uploadOverlay.classList.add('hidden');
                    changeImageBtn.style.display = 'flex';
                    deleteImageBtn.style.display = 'flex';
                    dropZone.classList.add('has-image');
                    
                    // Draw watermark
                    drawWatermark();
                };
                originalImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // Delete image
    function deleteImage() {
        originalImage = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        imageDimensions.textContent = 'No image loaded';
        imageSize.textContent = '0 KB';
        uploadOverlay.classList.remove('hidden');
        changeImageBtn.style.display = 'none';
        deleteImageBtn.style.display = 'none';
        dropZone.classList.remove('has-image');
        downloadBtn.disabled = true;
        // Clear the file input value
        imageInput.value = '';
    }

    // Event Listeners
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleImageUpload(file);
    });

    changeImageBtn.addEventListener('click', () => {
        imageInput.click();
    });

    deleteImageBtn.addEventListener('click', deleteImage);

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleImageUpload(file);
    });

    // Optimize control changes with debouncing
    [watermarkText, opacityInput, fontSizeInput, rotationInput, spacingInput, colorInput, fontFamilySelect].forEach(control => {
        control.addEventListener('input', () => {
            debounceSlider(() => {
                updateValueDisplays();
                drawWatermark();
            });
        });
    });

    // Handle Enter key in watermark text input
    watermarkText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            watermarkText.blur();
        }
    });

    // Advanced options
    [enableShadow, enableBlur, enableGradient].forEach(option => {
        option.addEventListener('change', drawWatermark);
    });

    // Pattern selection
    patternButtons.forEach(button => {
        button.addEventListener('click', () => {
            patternButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentPattern = button.id;
            drawWatermark();
        });
    });

    // Color controls
    invertColorBtn.addEventListener('click', () => {
        colorInput.value = invertColor(colorInput.value);
        drawWatermark();
    });

    randomColorBtn.addEventListener('click', () => {
        colorInput.value = getRandomColor();
        drawWatermark();
    });

    // Reset settings
    resetBtn.addEventListener('click', () => {
        initializeSettings();
        drawWatermark();
    });

    // Save preset
    savePresetBtn.addEventListener('click', () => {
        const preset = {
            name: prompt('Enter preset name:'),
            settings: {
                text: watermarkText.value,
                opacity: opacityInput.value,
                fontSize: fontSizeInput.value,
                rotation: rotationInput.value,
                spacing: spacingInput.value,
                color: colorInput.value,
                fontFamily: fontFamilySelect.value,
                pattern: currentPattern,
                shadow: enableShadow.checked,
                blur: enableBlur.checked,
                gradient: enableGradient.checked
            }
        };
        presets.push(preset);
        localStorage.setItem('watermarkPresets', JSON.stringify(presets));
        alert('Preset saved successfully!');
    });

    // Optimize download functionality for highest quality
    downloadBtn.addEventListener('click', () => {
        // Create a temporary canvas to maintain original dimensions
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d', { alpha: true, willReadFrequently: true });
        
        // Set dimensions to match original image exactly
        tempCanvas.width = originalImage.width;
        tempCanvas.height = originalImage.height;
        
        // Enable high-quality rendering
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        
        // Draw original image at full quality
        tempCtx.drawImage(originalImage, 0, 0);
        
        // Apply watermark with original dimensions
        const fontSize = parseInt(fontSizeInput.value);
        const opacity = parseInt(opacityInput.value) / 100;
        const rotation = parseInt(rotationInput.value);
        const spacing = parseFloat(spacingInput.value);
        const text = watermarkText.value;
        const color = colorInput.value;

        tempCtx.save();
        tempCtx.globalAlpha = opacity;
        tempCtx.font = `${fontSize}px ${fontFamilySelect.value}`;
        
        if (enableGradient.checked) {
            const gradient = tempCtx.createLinearGradient(0, 0, tempCanvas.width, tempCanvas.height);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, invertColor(color));
            tempCtx.fillStyle = gradient;
        } else {
            tempCtx.fillStyle = color;
        }

        if (enableShadow.checked) {
            tempCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            tempCtx.shadowBlur = 5;
            tempCtx.shadowOffsetX = 2;
            tempCtx.shadowOffsetY = 2;
        }

        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';

        const spacingPx = fontSize * spacing;
        const diagonal = Math.sqrt(tempCanvas.width * tempCanvas.width + tempCanvas.height * tempCanvas.height);
        const numWatermarks = Math.ceil(diagonal / spacingPx) * 2;

        // Draw watermark pattern
        switch (currentPattern) {
            case 'diagonal':
                drawDiagonalPattern(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas);
                break;
            case 'grid':
                drawGridPattern(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas);
                break;
            case 'random':
                drawRandomPattern(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas);
                break;
            case 'wave':
                drawWavePattern(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas);
                break;
            case 'spiral':
                drawSpiralPattern(numWatermarks, spacingPx, rotation, text, tempCtx, tempCanvas);
                break;
        }

        tempCtx.restore();

        // Create download link with highest quality PNG
        const link = document.createElement('a');
        link.download = 'watermarked-image.png';
        
        // Use maximum quality PNG encoding
        const pngData = tempCanvas.toDataURL('image/png', 1.0);
        
        // Create a blob for better quality
        fetch(pngData)
            .then(res => res.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                link.href = url;
        link.click();
                // Clean up
                URL.revokeObjectURL(url);
            });
    });

    // Zoom functionality
    zoomInBtn.addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + 0.1, 3);
        updateCanvasTransform();
    });

    zoomOutBtn.addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - 0.1, 0.5);
        updateCanvasTransform();
    });

    resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1;
        translateX = 0;
        translateY = 0;
        updateCanvasTransform();
    });

    // Fullscreen functionality
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            canvas.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Mobile touch handling
    function isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // Update canvas transform with mobile support
    function updateCanvasTransform() {
        if (isMobile()) {
            // On mobile, only apply zoom, not translation
            canvas.style.transform = `scale(${currentZoom})`;
        } else {
        canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
        }
    }

    // Update touch event listeners
    if (isMobile()) {
        let initialDistance = 0;
        let initialZoom = 1;

        // Remove mouse event listeners on mobile
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseUp);

        // Add touch event listeners
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Pinch start
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialZoom = currentZoom;
            } else if (e.touches.length === 1) {
                // Single touch start
                isDragging = true;
                startX = e.touches[0].clientX - translateX;
                startY = e.touches[0].clientY - translateY;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                // Pinch move
                e.preventDefault();
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const scale = currentDistance / initialDistance;
                currentZoom = Math.min(Math.max(initialZoom * scale, 0.5), 3);
                updateCanvasTransform();
            } else if (e.touches.length === 1 && isDragging) {
                // Single touch move
                e.preventDefault();
                translateX = e.touches[0].clientX - startX;
                translateY = e.touches[0].clientY - startY;
                updateCanvasTransform();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });

        // Remove zoom button event listeners on mobile
        zoomInBtn.removeEventListener('click', () => {});
        zoomOutBtn.removeEventListener('click', () => {});
        resetZoomBtn.removeEventListener('click', () => {});
    }

    // Initialize
    initializeSettings();
}); 
